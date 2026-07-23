data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "ai-docs-vpc-${var.environment}"
  }
}

# ── INTERNET GATEWAY (Public Internet access for ALB) ──────────────────────
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "ai-docs-igw-${var.environment}"
  }
}

# ── PUBLIC SUBNETS ─────────────────────────────────────────────────────────
# 3 Public Subnets across 3 AZs — used by ALB and NAT Gateways
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "ai-docs-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

# ── PRIVATE APP SUBNETS ────────────────────────────────────────────────────
# 3 Private Subnets across 3 AZs — used by ECS Fargate tasks
resource "aws_subnet" "private_app" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 4)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "ai-docs-private-app-subnet-${count.index + 1}-${var.environment}"
    Type = "PrivateApp"
  }
}

# ── PRIVATE DB SUBNETS ─────────────────────────────────────────────────────
# 3 Private DB Subnets across 3 AZs — used by DocumentDB and Redis
resource "aws_subnet" "private_db" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "ai-docs-private-db-subnet-${count.index + 1}-${var.environment}"
    Type = "PrivateDB"
  }
}

# ── ELASTIC IPs FOR NAT GATEWAYS ───────────────────────────────────────────
# 2 EIPs — one per NAT Gateway
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "ai-docs-nat-eip-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.gw]
}

# ── NAT GATEWAYS ───────────────────────────────────────────────────────────
# 2 NAT Gateways in AZ-1 and AZ-2 public subnets
# AZ-3 private subnets fall back to NAT-1 (AZ-1) for resilience
resource "aws_nat_gateway" "nat" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "ai-docs-nat-gw-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.gw]
}

# ── PUBLIC ROUTE TABLE ─────────────────────────────────────────────────────
# All public subnets → Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "ai-docs-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── PRIVATE APP ROUTE TABLES ───────────────────────────────────────────────
# 2 private route tables (one per NAT):
#   private_app[0] → nat[0] (AZ-1)
#   private_app[1] → nat[1] (AZ-2)
#   private_app[2] → nat[0] (AZ-1 fallback for AZ-3)
resource "aws_route_table" "private_app" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = {
    Name = "ai-docs-private-app-rt-${count.index + 1}-${var.environment}"
  }
}

# AZ-1 ECS subnet → NAT-1
resource "aws_route_table_association" "private_app_az1" {
  subnet_id      = aws_subnet.private_app[0].id
  route_table_id = aws_route_table.private_app[0].id
}

# AZ-2 ECS subnet → NAT-2
resource "aws_route_table_association" "private_app_az2" {
  subnet_id      = aws_subnet.private_app[1].id
  route_table_id = aws_route_table.private_app[1].id
}

# AZ-3 ECS subnet → NAT-1 (fallback)
resource "aws_route_table_association" "private_app_az3" {
  subnet_id      = aws_subnet.private_app[2].id
  route_table_id = aws_route_table.private_app[0].id
}

# ── PRIVATE DB ROUTE TABLE ─────────────────────────────────────────────────
# DB subnets are fully private — no internet route needed.
# They only talk to ECS tasks inside the VPC via security groups.
resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.main.id

  # No internet route — DB subnets are completely isolated from internet
  tags = {
    Name = "ai-docs-private-db-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "private_db" {
  count          = 3
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db.id
}

# ── SUBNET GROUPS ──────────────────────────────────────────────────────────
# DocumentDB Subnet Group (uses all 3 private DB subnets)
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "ai-docs-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_db[*].id

  tags = {
    Name = "ai-docs-db-subnet-group-${var.environment}"
  }
}

# ElastiCache Subnet Group (uses all 3 private DB subnets)
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "ai-docs-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_db[*].id
}
