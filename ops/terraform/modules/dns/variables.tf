variable "zone" {
  description = "Domain whose records this module manages."
  type        = string
}

variable "records" {
  description = "Records keyed by a stable name. `name` is relative to the zone; use @ for the bare domain."
  type = map(object({
    name  = string
    type  = string
    value = string
    ttl   = optional(number, 14400)
  }))
}
