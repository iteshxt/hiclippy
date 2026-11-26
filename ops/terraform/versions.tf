terraform {
  required_version = ">= 1.6.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.27"
    }
    render = {
      source  = "render-oss/render"
      version = "~> 1.9"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 2.22"
    }
    hostinger = {
      source  = "hostinger/hostinger"
      version = "~> 0.1.23"
    }
  }
}
