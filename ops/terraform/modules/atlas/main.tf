# The HiClippy database: one free (M0) MongoDB Atlas cluster.

resource "mongodbatlas_project" "this" {
  name   = var.project_name
  org_id = var.org_id

  # Project settings as they are today.
  is_atlas_home_page_ai_assistant_enabled                 = true
  is_cluster_ai_assistant_enabled                         = true
  is_collect_database_specifics_statistics_enabled        = true
  is_data_explorer_enabled                                = true
  is_data_explorer_gen_ai_features_enabled                = true
  is_data_explorer_gen_ai_sample_document_passing_enabled = false
  is_extended_storage_sizes_enabled                       = false
  is_native_reranking_enabled                             = false
  is_performance_advisor_enabled                          = true
  is_realtime_performance_panel_enabled                   = true
  is_schema_advisor_enabled                               = true
  with_default_alerts_settings                            = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "mongodbatlas_advanced_cluster" "this" {
  project_id             = mongodbatlas_project.this.id
  name                   = var.cluster_name
  cluster_type           = "REPLICASET"
  mongo_db_major_version = "8.0"
  version_release_system = "LTS"

  # A free M0 cluster runs on shared ("TENANT") infrastructure. Backups,
  # auto-scaling and point-in-time restore are not available on this tier.
  replication_specs = [
    {
      zone_name = "Zone 1"
      region_configs = [
        {
          provider_name         = "TENANT"
          backing_provider_name = var.cloud_provider
          region_name           = var.region
          priority              = 7
          electable_specs = {
            instance_size = "M0"
            disk_size_gb  = 0.5
          }
        },
      ]
    },
  ]

  backup_enabled                                         = false
  pit_enabled                                            = false
  paused                                                 = false
  termination_protection_enabled                         = false
  encryption_at_rest_provider                            = "NONE"
  global_cluster_self_managed_sharding                   = false
  redact_client_log_data                                 = false
  root_cert_type                                         = "ISRGROOTX1"
  use_aws_time_based_snapshot_copy_for_fast_initial_sync = false

  bi_connector_config = {
    enabled         = false
    read_preference = "secondary"
  }

  advanced_configuration = {
    change_stream_options_pre_and_post_images_expire_after_seconds = -1
    custom_openssl_cipher_config_tls12                             = []
    custom_openssl_cipher_config_tls13                             = []
    javascript_enabled                                             = true
    minimum_enabled_tls_protocol                                   = "TLS1_2"
    no_table_scan                                                  = false
    oplog_min_retention_hours                                      = 0
    oplog_size_mb                                                  = 0
    sample_refresh_interval_bi_connector                           = 0
    sample_size_bi_connector                                       = 0
    tls_cipher_config_mode                                         = "DEFAULT"
    transaction_lifetime_limit_seconds                             = 0
  }

  lifecycle {
    # Destroying the cluster deletes every stored clip.
    prevent_destroy = true
  }
}

# Who may connect to the database. Render's free tier has no fixed outbound
# IP addresses, so today this is open to everyone (0.0.0.0/0) and the
# database relies on its username and password alone. Recorded here so the
# exposure is visible in code; narrowing it needs a paid Render plan with
# static IPs.
resource "mongodbatlas_project_ip_access_list" "this" {
  project_id = mongodbatlas_project.this.id
  cidr_block = var.access_list_cidr
}
