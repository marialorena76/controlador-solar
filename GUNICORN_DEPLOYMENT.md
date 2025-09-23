# Instrucciones para Despliegue de Gunicorn con systemd y OpenLiteSpeed

Este documento proporciona una guía para configurar Gunicorn como un servicio de `systemd` y conectarlo con OpenLiteSpeed como un proxy inverso. Esta configuración es robusta y previene los errores de "address already in use".

## 1. Instalar Dependencias

Asegúrate de que todas las dependencias, incluyendo `gunicorn` y `sdnotify`, estén instaladas en tu entorno virtual.

```bash
pip install -r requirements.txt
```

## 2. Configurar el Servicio de systemd

He creado un archivo de plantilla llamado `controlador-solar.service`. Este archivo debe ser modificado y luego copiado a `/etc/systemd/system/`.

**Contenido de `controlador-solar.service`:**
```ini
[Unit]
Description=Gunicorn instance to serve a Flask application
After=network.target

[Service]
# Reemplaza 'your_user' con tu nombre de usuario en el servidor
User=your_user
Group=your_user

# Reemplaza con la ruta absoluta a la raíz de tu proyecto
WorkingDirectory=/path/to/your/project/root

# Comando para iniciar Gunicorn (usando un socket Unix)
# Asegúrate de que la ruta a gunicorn sea la correcta para tu entorno virtual
ExecStart=/path/to/your/project/root/venv/bin/gunicorn --workers 3 --worker-class gthread --threads 4 --bind unix:controlador-solar.sock wsgi:app

# Si prefieres usar un puerto TCP en lugar de un socket:
# ExecStart=/path/to/your/project/root/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 wsgi:app

Restart=always

[Install]
WantedBy=multi-user.target
```

### Pasos para la instalación:

1.  **Edita el archivo:**
    *   Cambia `User=your_user` y `Group=your_user` por tu usuario y grupo en el VPS.
    *   Cambia `WorkingDirectory=/path/to/your/project/root` a la ruta absoluta de tu proyecto (ej. `/home/calculadorsolar.soyloregonzalez.com/`).
    *   Asegúrate de que la ruta en `ExecStart` a `gunicorn` sea la correcta (dentro de tu `venv`).

2.  **Copia el archivo al directorio de systemd:**
    ```bash
    sudo cp controlador-solar.service /etc/systemd/system/controlador-solar.service
    ```

3.  **Recarga, inicia y habilita el servicio:**
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl start controlador-solar
    sudo systemctl enable controlador-solar
    ```

4.  **Verifica el estado del servicio:**
    ```bash
    sudo systemctl status controlador-solar
    ```
    Deberías ver que está "active (running)".

## 3. Configurar OpenLiteSpeed como Proxy Inverso

La configuración del proxy en OpenLiteSpeed debe apuntar al socket de Gunicorn.

### Si usas un Socket Unix (Recomendado):

En la configuración de tu VirtualHost en OpenLiteSpeed, actualiza el contexto para que apunte al socket. La ruta al socket es relativa al `WorkingDirectory` que definiste en el archivo de servicio.

```
context /api {
  type    proxy
  address unix:///path/to/your/project/root/controlador-solar.sock
  keepAlive 1
}
```
**Importante:** Reemplaza `/path/to/your/project/root/` con la ruta real. OpenLiteSpeed necesita permisos para acceder al archivo del socket. Asegúrate de que el usuario con el que corre OpenLiteSpeed (normalmente `nobody` o `litespeed`) pueda acceder al socket.

### Si usas un Puerto TCP:

Si decidiste usar `bind 127.0.0.1:5000` en el archivo de servicio, tu configuración actual de OpenLiteSpeed es correcta:

```
context /api {
  type    proxy
  address 127.0.0.1:5000
  keepAlive 1
}
```

Al seguir estos pasos, tendrás una única instancia de Gunicorn gestionada correctamente por `systemd`, lo que resolverá los problemas de puertos y asegurará que la aplicación se reinicie automáticamente si falla.
