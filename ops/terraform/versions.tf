terraform {
  required_version = ">= 1.7.0" # import blocks with for_each

  # State stays on this laptop, outside every repo and worktree, so it can
  # never be committed. The path is given at init time (see README):
  #   terraform init -backend-config="path=$HOME/.local/share/hiclippy-terraform/terraform.tfstate"
  backend "local" {}

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
    local = {
      source  = "hashicorp/local"
      version = "~> 2.9"
    }
  }
}
