/* HiClippy status dashboard: live data from Nagios Core's JSON CGIs.
 *
 *   statusjson.cgi   current host/service state and program status
 *   objectjson.cgi   host aliases
 *   archivejson.cgi  alerts from the last 24 hours
 *   cmd.cgi          "Re-check now", through Nagios's own command form
 *
 * Served from /nagios/hiclippy/, so the same login protects it.
 */
(function () {
  'use strict';

  var CGI = '../cgi-bin/';
  var REFRESH_MS = 30000;

  // Nagios JSON status codes are bit flags.
  var SERVICE = { 1: 'pend', 2: 'ok', 4: 'warn', 8: 'unk', 16: 'crit' };
  var SERVICE_TEXT = { pend: 'PENDING', ok: 'OK', warn: 'WARNING', unk: 'UNKNOWN', crit: 'CRITICAL' };
  var HOST = { 1: 'pend', 2: 'ok', 4: 'crit', 8: 'unk' };
  var HOST_TEXT = { pend: 'PENDING', ok: 'UP', crit: 'DOWN', unk: 'UNREACHABLE' };
  // archivejson.cgi uses its own state numbers.
  var ALERT = {
    1: ['ok', 'UP'], 2: ['crit', 'DOWN'], 4: ['unk', 'UNREACHABLE'],
    8: ['ok', 'OK'], 16: ['warn', 'WARNING'], 32: ['crit', 'CRITICAL'], 64: ['unk', 'UNKNOWN']
  };
  var SEVERITY = { ok: 0, pend: 1, unk: 2, warn: 3, crit: 4 };

  // How checks are grouped: by what they protect, not by host.
  var AREAS = [
    { id: 'website', title: 'Website', blurb: 'www.hiclippy.online on Vercel' },
    { id: 'api', title: 'API', blurb: 'clippy-api.onrender.com on Render' },
    { id: 'dns', title: 'DNS', blurb: 'Hostinger records still point at Vercel' },
    { id: 'certs', title: 'Certificates', blurb: 'HTTPS certificates and days left' }
  ];
  function areaOf(host, service) {
    if (/certificate/i.test(service)) return 'certs';
    if (/^dns\b/i.test(service)) return 'dns';
    if (/onrender\.com$/.test(host)) return 'api';
    return 'website';
  }

  var $ = function (id) { return document.getElementById(id); };
  var lastData = null;
  var timer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(ms) {
    if (!ms) return 'never';
    var s = Math.round((Date.now() - ms) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return s + ' s ago';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }
  function until(ms) {
    if (!ms) return '';
    var s = Math.round((ms - Date.now()) / 1000);
    if (s <= 0) return 'due now';
    if (s < 60) return 'in ' + s + ' s';
    if (s < 3600) return 'in ' + Math.round(s / 60) + ' min';
    return 'in ' + Math.round(s / 3600) + ' h';
  }
  function clock(ms) {
    var d = new Date(ms);
    var today = new Date().toDateString() === d.toDateString();
    var t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return today ? t : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + t;
  }

  // ── Data ────────────────────────────────────────────────────────────────

  function getJSON(url) {
    return fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
      // An expired session is redirected to the login page (HTML, not JSON).
      var type = res.headers.get('content-type') || '';
      if (res.redirected && /login\.html/.test(res.url) || type.indexOf('json') === -1) {
        window.top.location.href = '/login.html';
        throw new Error('signed out');
      }
      if (!res.ok) throw new Error(url + ' returned HTTP ' + res.status);
      return res.json();
    }).then(function (body) {
      if (body.result && body.result.type_code !== 0) throw new Error(body.result.message || 'Nagios query failed');
      return body.data;
    });
  }

  function load() {
    var now = Math.floor(Date.now() / 1000);
    return Promise.all([
      getJSON(CGI + 'statusjson.cgi?query=servicelist&details=true'),
      getJSON(CGI + 'statusjson.cgi?query=hostlist&details=true'),
      getJSON(CGI + 'objectjson.cgi?query=hostlist&details=true'),
      getJSON(CGI + 'statusjson.cgi?query=programstatus'),
      getJSON(CGI + 'archivejson.cgi?query=alertlist&starttime=' + (now - 86400) + '&endtime=' + now)
        .catch(function () { return { alertlist: [] }; })
    ]).then(function (r) {
      return { services: r[0].servicelist, hosts: r[1].hostlist, objects: r[2].hostlist, program: r[3].programstatus, alerts: r[4].alertlist || [] };
    });
  }

  // ── Parsing plugin output ───────────────────────────────────────────────

  function perf(perfData, key) {
    var m = new RegExp('(?:^|\\s)' + key + '=([0-9.]+)s').exec(perfData || '');
    return m ? parseFloat(m[1]) : null;
  }
  function certDays(output) {
    var m = /expire in (\d+) day/.exec(output || '');
    return m ? parseInt(m[1], 10) : null;
  }
  function dnsAnswer(output) {
    var m = /\s(?:IN\s+)?(A|CNAME)\s+([^\s)]+)\)?\s*$/.exec(output || '');
    return m ? m[2].replace(/\.$/, '') : null;
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  function render(d) {
    lastData = d;
    $('error').hidden = true;

    var checks = [];
    Object.keys(d.services).forEach(function (host) {
      Object.keys(d.services[host]).forEach(function (name) {
        var s = d.services[host][name];
        checks.push({ host: host, name: name, s: s, state: SERVICE[s.status] || 'unk', area: areaOf(host, name) });
      });
    });
    var hosts = Object.keys(d.hosts).map(function (name) {
      var h = d.hosts[name];
      return { name: name, h: h, state: HOST[h.status] || 'unk', alias: (d.objects[name] || {}).alias || name };
    });

    // Summary numbers
    var upHosts = hosts.filter(function (h) { return h.state === 'ok'; }).length;
    var okChecks = checks.filter(function (c) { return c.state === 'ok'; }).length;
    var problems = checks.filter(function (c) {
      return c.state !== 'ok' && c.state !== 'pend' && !c.s.problem_has_been_acknowledged && !c.s.scheduled_downtime_depth;
    }).length + hosts.filter(function (h) {
      return h.state !== 'ok' && h.state !== 'pend' && !h.h.problem_has_been_acknowledged && !h.h.scheduled_downtime_depth;
    }).length;
    var handled = checks.filter(function (c) { return c.s.problem_has_been_acknowledged || c.s.scheduled_downtime_depth; }).length
      + hosts.filter(function (h) { return h.h.problem_has_been_acknowledged || h.h.scheduled_downtime_depth; }).length;
    $('kpi-hosts').innerHTML = upHosts + ' <small>/ ' + hosts.length + '</small>';
    $('kpi-services').innerHTML = okChecks + ' <small>/ ' + checks.length + '</small>';
    $('kpi-problems').textContent = problems;
    $('kpi-handled').textContent = handled;

    // Overall banner: only HARD, unhandled problems count as an outage.
    var worst = 'ok';
    checks.concat(hosts.map(function (h) { return { state: h.state, s: h.h }; })).forEach(function (c) {
      if (c.state === 'pend' || c.s.problem_has_been_acknowledged || c.s.scheduled_downtime_depth) return;
      var level = c.s.state_type === 1 ? c.state : (c.state === 'ok' ? 'ok' : 'warn'); // soft = retrying
      if (SEVERITY[level] > SEVERITY[worst]) worst = level;
    });
    var overall = $('overall');
    var mood = worst === 'ok' ? 'ok' : worst === 'crit' ? 'crit' : 'warn';
    overall.className = 'overall is-' + mood;
    $('overall-text').textContent = mood === 'ok'
      ? 'All systems operational'
      : mood === 'crit' ? 'Outage: ' + problems + ' problem' + (problems === 1 ? '' : 's')
      : 'Degraded: ' + Math.max(problems, 1) + (Math.max(problems, 1) === 1 ? ' check needs' : ' checks need') + ' attention';

    // Hosts
    $('hosts').innerHTML = hosts.map(function (h) {
      return '<div class="host"><span class="pill ' + h.state + '">' + HOST_TEXT[h.state] + '</span>' +
        '<div class="host-body"><a class="host-name" href="' + CGI + 'extinfo.cgi?type=1&amp;host=' + encodeURIComponent(h.name) + '">' + esc(h.name) + '</a>' +
        '<span class="host-sub">' + esc(h.alias) + ', checked ' + ago(h.h.last_check) + '</span></div></div>';
    }).join('');

    // Checks, grouped by area
    $('areas').innerHTML = AREAS.map(function (area) {
      var list = checks.filter(function (c) { return c.area === area.id; })
        .sort(function (a, b) { return SEVERITY[b.state] - SEVERITY[a.state] || a.name.localeCompare(b.name); });
      if (!list.length) return '';
      var ok = list.filter(function (c) { return c.state === 'ok'; }).length;
      return '<article class="area"><div class="area-head"><div><h2>' + esc(area.title) + '</h2><p>' + esc(area.blurb) + '</p></div>' +
        '<span class="area-count">' + ok + ' of ' + list.length + ' OK</span></div>' +
        list.map(renderCheck).join('') + '</article>';
    }).join('');

    // Alerts, newest first
    var alerts = (d.alerts || []).slice().sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 12);
    $('alerts').innerHTML = alerts.length ? alerts.map(function (a) {
      var st = ALERT[a.state] || ['unk', 'STATE ' + a.state];
      var what = a.object_type === 2 ? esc(a.description) + ' <span>on ' + esc(a.host_name) + '</span>' : esc(a.host_name);
      return '<li><span class="when">' + clock(a.timestamp) + '</span><span class="pill ' + st[0] + '">' + st[1] + '</span>' +
        // archivejson numbers state types the other way round from statusjson:
        // 1 = HARD, 2 = SOFT (checked against "SERVICE ALERT ...;SOFT;" in nagios.log).
        '<span class="what"><b>' + what + (a.state_type === 2 ? ' <span class="tag soft">soft</span>' : '') + '</b><span>' + esc(a.plugin_output) + '</span></span></li>';
    }).join('') : '<li class="empty">No alerts in the last 24 hours.</li>';

    // Footer: is Nagios itself healthy?
    var p = d.program || {};
    $('foot').innerHTML =
      '<span>Nagios Core <b>' + esc(p.version) + '</b></span>' +
      '<span>Running since <b>' + (p.program_start ? new Date(p.program_start).toLocaleString() : '?') + '</b></span>' +
      '<span>Checks <b>' + (p.execute_service_checks ? 'on' : 'OFF') + '</b></span>' +
      '<span>Notifications <b>' + (p.enable_notifications ? 'on' : 'OFF') + '</b></span>' +
      '<span>Healthy checks run every 5 minutes, which also keeps the free Render API awake.</span>';

    updateClock();
  }

  function renderCheck(c) {
    var s = c.s;
    var metrics = [];
    var rt = perf(s.perf_data, 'time');
    var total = perf(s.perf_data, 'total');
    if (total != null) metrics.push('Round trip <b>' + total.toFixed(2) + ' s</b>');
    else if (rt != null) metrics.push('Response <b>' + (rt < 1 ? Math.round(rt * 1000) + ' ms' : rt.toFixed(2) + ' s') + '</b>');
    var days = certDays(s.plugin_output);
    if (days != null) {
      var level = days < 7 ? 'crit' : days < 30 ? 'warn' : '';
      metrics.push('<b>' + days + ' days</b> left <span class="meter ' + level + '" title="out of 90"><span style="width:' + Math.min(100, Math.round(days / 90 * 100)) + '%"></span></span>');
    }
    var answer = /^dns/i.test(c.name) ? dnsAnswer(s.plugin_output) : null;
    if (answer) metrics.push('Answers <b>' + esc(answer) + '</b>');
    metrics.push('Checked <b>' + ago(s.last_check) + '</b>');
    if (s.next_check) metrics.push('next ' + until(s.next_check));

    var tags = [];
    if (s.state_type === 0 && c.state !== 'ok') tags.push('<span class="tag soft" title="Failed, being retried every minute before it counts as a real problem">Retrying ' + s.current_attempt + '/' + s.max_attempts + ' (soft)</span>');
    else tags.push('<span class="check-host">Attempt ' + s.current_attempt + '/' + s.max_attempts + (s.state_type === 1 ? ', hard' : ', soft') + '</span>');
    if (s.problem_has_been_acknowledged) tags.push('<span class="tag ack">Acknowledged</span>');
    if (s.scheduled_downtime_depth) tags.push('<span class="tag down">In downtime</span>');
    if (s.is_flapping) tags.push('<span class="tag flap">Flapping</span>');

    var details = CGI + 'extinfo.cgi?type=2&amp;host=' + encodeURIComponent(c.host) + '&amp;service=' + encodeURIComponent(c.name);
    var stateClass = c.state === 'ok' || c.state === 'pend' ? '' : ' is-' + c.state;
    return '<div class="check' + stateClass + '">' +
      '<div class="check-top"><span class="pill ' + c.state + '">' + SERVICE_TEXT[c.state] + '</span>' +
      '<span class="check-name">' + esc(c.name) + '</span>' +
      (c.area === 'certs' || c.area === 'dns' ? '<span class="check-host">' + esc(c.host) + '</span>' : '') +
      '<span class="check-actions"><button type="button" class="btn" data-recheck data-host="' + esc(c.host) + '" data-service="' + esc(c.name) + '">Re-check</button>' +
      '<a class="btn" href="' + details + '">Details</a></span></div>' +
      '<p class="check-out">' + esc(s.plugin_output) + '</p>' +
      '<div class="check-meta">' + metrics.map(function (m) { return '<span>' + m + '</span>'; }).join('') + tags.join('') + '</div></div>';
  }

  function updateClock() {
    if (!lastData) return;
    $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ', refreshes every 30 s';
  }

  function showError(err) {
    if (err && err.message === 'signed out') return;
    var box = $('error');
    box.textContent = 'Could not load live status from Nagios: ' + (err && err.message ? err.message : err) + '. Retrying in 30 s.';
    box.hidden = false;
  }

  function refresh() {
    clearTimeout(timer);
    return load().then(render).catch(showError).then(function () {
      if (!document.hidden) timer = setTimeout(refresh, REFRESH_MS);
    });
  }

  // ── Re-check now ────────────────────────────────────────────────────────
  // Uses Nagios's command form: fetch it to get its one-time nagFormId
  // token, then submit it the way the Commit button does.

  function recheck(btn) {
    var host = btn.getAttribute('data-host');
    var service = btn.getAttribute('data-service');
    var q = 'cmd_typ=7&host=' + encodeURIComponent(host) + '&service=' + encodeURIComponent(service);
    btn.disabled = true;
    btn.textContent = 'Queuing…';
    fetch(CGI + 'cmd.cgi?' + q, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var token = doc.querySelector('input[name="nagFormId"]');
        var start = doc.querySelector('input[name="start_time"]');
        if (!token || !start) throw new Error('command form not available');
        var body = new URLSearchParams({
          nagFormId: token.value, cmd_typ: '7', cmd_mod: '2', host: host, service: service,
          start_time: start.value, force_check: 'on', btnSubmit: 'Commit'
        });
        return fetch(CGI + 'cmd.cgi', { method: 'POST', credentials: 'same-origin', body: body });
      })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        if (!/successfully submitted/i.test(html)) throw new Error('Nagios did not accept the command');
        btn.textContent = 'Queued';
        btn.classList.add('done');
        setTimeout(refresh, 4000);
        setTimeout(refresh, 12000);
      })
      .catch(function (err) {
        btn.textContent = 'Failed';
        btn.title = err.message;
      })
      .then(function () {
        setTimeout(function () { btn.disabled = false; }, 4000);
      });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-recheck]');
    if (btn) recheck(btn);
  });
  $('refresh').addEventListener('click', refresh);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh(); else clearTimeout(timer);
  });
  setInterval(function () { if (lastData && !document.hidden) render(lastData); }, 15000); // keep "x min ago" fresh

  refresh();
})();
