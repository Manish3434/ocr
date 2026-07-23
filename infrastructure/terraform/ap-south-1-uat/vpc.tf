data "aws_availability_zones" "available" {
  state = "available"
}

# High Availability Multi-AZ VPC spanning 3 Availability Zones
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "ai-docs-vpc-${var.environment}"
  }
}

# Internet Gateway for Public Subnets
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "ai-docs-igw-${var.environment}"
  }
}

# 3 Public Subnets (ALB & NAT Gateway)
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

# 3 Private Application Subnets (ECS Fargate Tasks)
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

# 3 Private Database Subnets (Redis & DocumentDB/RDS)
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

# Single Elastic IP for NAT Gateway (cost-optimised for UAT)
resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"

  tags = {
    Name = "ai-docs-nat-eip-${var.environment}"
  }
}

# Single NAT Gateway in first AZ (cost-optimised for UAT)
resource "aws_nat_gateway" "nat" {
  count         = 1
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "ai-docs-nat-gw-${var.environment}"
  }

  depends_on = [aws_internet_gateway.gw]
}

# Public Route Table
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

# Single shared Private Route Table via the one NAT Gateway
resource "aws_route_table" "private_app" {
  count  = 1
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[0].id
  }

  tags = {
    Name = "ai-docs-private-app-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "private_app" {
  count          = 3
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app[0].id
}

# Database Subnet Group for RDS/DocumentDB
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "ai-docs-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_db[*].id

  tags = {
    Name = "ai-docs-db-subnet-group-${var.environment}"
  }
}

# ElastiCache Subnet Group for Redis
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "ai-docs-redis-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private_db[*].id
}
