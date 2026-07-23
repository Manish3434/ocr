variable "environment" {
  type    = string
  default = "uat"
}

variable "vpc_id" {
  type    = string
  default = ""
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "security_group_id" {
  type    = string
  default = ""
}

variable "db_host" {
  type    = string
  default = ""
}

variable "db_port" {
  type    = number
  default = 5432
}

variable "max_client_conn" {
  type    = number
  default = 2000
}

variable "default_pool_size" {
  type    = number
  default = 20
}
