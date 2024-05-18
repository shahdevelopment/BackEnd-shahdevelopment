# Use the official PostgreSQL image as a parent image
FROM postgres:alpine


ARG pg_user
ENV POSTGRES_USER="$pg_user"
ARG pg_pass
ENV POSTGRES_PASSWORD="$pg_pass"
ARG pg_db
ENV POSTGRES_DB="$pg_db"


# Expose the PostgreSQL port
EXPOSE 5432