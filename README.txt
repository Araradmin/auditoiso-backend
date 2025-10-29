AuditoIso - Backend (Express) - Almacenamiento local por archivos (persistencia básica)

▶ Requisitos locales:
  - Node.js 18+
  - (Opcional) variables de entorno en un archivo .env (copiar desde .env.example)

▶ Ejecutar en local:
  1) npm install
  2) npm start
  3) Visitar: http://localhost:4000/health

▶ Endpoints principales:
  - POST /api/auth/login (email, password)
  - GET  /api/checklists/defaults
  - GET  /api/audits      (autenticación requerida)
  - POST /api/audits      (autenticación requerida)
  - GET  /api/reports/:id/pdf (autenticación requerida)

▶ Usuario por defecto:
  email:    admin@example.com
  password: password

▶ Variables de entorno (ver .env.example):
  - PORT=4000
  - FRONTEND_URL=*
  - JWT_SECRET=mi_clave_segura
  - DATA_DIR=./data

⚠ Nota sobre persistencia gratuita en Render:
  - El almacenamiento por archivos funciona y persistirá en tu máquina local.
  - En Render (plan gratuito), el disco puede resetearse al reiniciar el servicio.
  - Si necesitas persistencia 100% confiable y gratuita en la nube:
    1) Crea un cluster Free en MongoDB Atlas.
    2) Define MONGODB_URI en el backend y migra a base de datos.
    (Esta versión ya está lista para almacenamiento por archivos; integra Mongo sólo si lo deseas.)

