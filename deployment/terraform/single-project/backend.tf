# Shared remote state for CI/CD and local runs.
terraform {
  backend "gcs" {}
}
