# Nagios Core and the Nagios plugins, compiled from source, with the
# HiClippy monitoring config. See README.md.
FROM debian:13-slim

ARG NAGIOS_VERSION=4.5.14
ARG NAGIOS_SHA256=dce59f306577789c56d2748471d4c3856ecba8572d6b0811cf79f9de2f9afabb
ARG PLUGINS_VERSION=2.5
ARG PLUGINS_SHA256=44d1510b5e17055fd9aa4a1d9662a234fc5d5c1b96548852c8e78701584b2684

ENV DEBIAN_FRONTEND=noninteractive

# Build tools, Apache + PHP for the web interface, and what the plugins
# need at build and run time (OpenSSL for HTTPS checks, dig/nslookup for
# DNS checks, Python for the custom round-trip check).
RUN apt-get update && apt-get install -y --no-install-recommends \
        autoconf automake bc build-essential ca-certificates dc gawk gettext \
        libgd-dev libssl-dev openssl unzip wget \
        apache2 apache2-utils libapache2-mod-php php \
        bind9-dnsutils iputils-ping procps python3 tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/build

# ── Nagios Core ─────────────────────────────────────────────────────
RUN wget -q -O nagios.tar.gz \
        "https://github.com/NagiosEnterprises/nagioscore/releases/download/nagios-${NAGIOS_VERSION}/nagios-${NAGIOS_VERSION}.tar.gz" \
    && echo "${NAGIOS_SHA256}  nagios.tar.gz" | sha256sum -c - \
    && tar xzf nagios.tar.gz \
    && cd "nagios-${NAGIOS_VERSION}" \
    && ./configure --with-httpd-conf=/etc/apache2/sites-enabled \
    && make all \
    && make install-groups-users \
    && usermod -a -G nagios www-data \
    && make install \
    && make install-commandmode \
    && make install-config \
    && make install-webconf

# ── Nagios plugins ──────────────────────────────────────────────────
RUN wget -q -O plugins.tar.gz \
        "https://github.com/nagios-plugins/nagios-plugins/releases/download/release-${PLUGINS_VERSION}/nagios-plugins-${PLUGINS_VERSION}.tar.gz" \
    && echo "${PLUGINS_SHA256}  plugins.tar.gz" | sha256sum -c - \
    && tar xzf plugins.tar.gz \
    && cd "nagios-plugins-${PLUGINS_VERSION}" \
    && ./configure --with-nagios-user=nagios --with-nagios-group=nagios \
    && make \
    && make install \
    && rm -rf /tmp/build

WORKDIR /usr/local/nagios

# Web interface: CGI scripts, URL rewriting, and a form login page with an
# encrypted session cookie (see web/nagios-apache.conf for why not Basic
# auth). The stock Basic-auth site config is replaced.
RUN a2enmod cgi rewrite auth_form session session_cookie session_crypto request >/dev/null \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf
COPY web/nagios-apache.conf /etc/apache2/sites-enabled/nagios.conf
COPY web/login.html /var/www/html/login.html

# HiClippy config: hosts, services, commands, contacts, and the custom
# round-trip plugin. The stock example (monitoring the container itself)
# is left out so the dashboard only shows HiClippy.
COPY etc/hiclippy.cfg etc/objects/hiclippy.cfg
COPY plugins/check_hiclippy_roundtrip.py libexec/check_hiclippy_roundtrip.py
RUN chmod 755 libexec/check_hiclippy_roundtrip.py \
    && sed -i 's|^cfg_file=/usr/local/nagios/etc/objects/localhost.cfg|#&|' etc/nagios.cfg \
    && echo "cfg_file=/usr/local/nagios/etc/objects/hiclippy.cfg" >> etc/nagios.cfg \
    && bin/nagios -v etc/nagios.cfg

COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

EXPOSE 80
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s \
    CMD pgrep -x nagios >/dev/null && pgrep -x apache2 >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
