variable "org_id" {
  description = "Atlas organization that owns the project."
  type        = string
}

variable "project_name" {
  description = "Atlas project name."
  type        = string
}

variable "cluster_name" {
  description = "Atlas cluster name."
  type        = string
}

variable "cloud_provider" {
  description = "Cloud provider under the shared M0 cluster."
  type        = string
  default     = "AWS"
}

variable "region" {
  description = "Atlas region name, e.g. AP_SOUTH_1 (Mumbai)."
  type        = string
}

variable "access_list_cidr" {
  description = "CIDR block allowed to connect to the database."
  type        = string
}
