# Versions are pinned in the root module (../../versions.tf).
terraform {
  required_providers {
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
    }
  }
}
