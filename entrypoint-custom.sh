#!/bin/bash
# Custom entrypoint based on the image's /entrypoint.sh.
# Difference: it does NOT chown /mnt/extra-addons, because that directory is
# bind-mounted from the host and chowning it to the in-container 'odoo' user
# makes host-side editing fail.
set -e

echo "Preparing volumes..."
chown -R odoo:odoo /etc/odoo
chown -R odoo:odoo /var/lib/odoo
echo "Volumes ready."

if [ -v PASSWORD_FILE ]; then
    PASSWORD="$(< $PASSWORD_FILE)"
fi

: ${HOST:=${DB_PORT_5432_TCP_ADDR:='db'}}
: ${PORT:=${DB_PORT_5432_TCP_PORT:=5432}}
: ${USER:=${DB_ENV_POSTGRES_USER:=${POSTGRES_USER:='odoo'}}}
: ${PASSWORD:=${DB_ENV_POSTGRES_PASSWORD:=${POSTGRES_PASSWORD:='odoo'}}}

DB_ARGS=()
function check_config() {
    param="$1"
    value="$2"
    if grep -q -E "^\s*\b${param}\b\s*=" "$ODOO_RC" ; then
        value=$(grep -E "^\s*\b${param}\b\s*=" "$ODOO_RC" |cut -d " " -f3|sed 's/["\n\r]//g')
    fi;
    DB_ARGS+=("--${param}")
    DB_ARGS+=("${value}")
}
check_config "db_host" "$HOST"
check_config "db_port" "$PORT"
check_config "db_user" "$USER"
check_config "db_password" "$PASSWORD"

case "$1" in
    -- | odoo)
        shift
        if [[ "$1" == "scaffold" ]] ; then
            exec gosu odoo python3 -m odoo "$@"
        else
            wait-for-psql.py ${DB_ARGS[@]} --timeout=30
            exec gosu odoo python3 -m odoo "$@" "${DB_ARGS[@]}"
        fi
        ;;
    -*)
        wait-for-psql.py ${DB_ARGS[@]} --timeout=30
        exec gosu odoo python3 -m odoo "$@" "${DB_ARGS[@]}"
        ;;
    *)
        exec gosu odoo "$@"
esac

exit 1
