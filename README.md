# 📂 Proyecto StudyHub
Este es el repositorio del proyecto en el que desarrollaremos una web de reserva deportiva.

# 🤝 Equipo:
Diego González Moreno
Saúl Falcón Gil
Cathaysa Moreno Cabrera
Samuel Santana García
Edwin Johnson Osagie Batista

# 👀 Descripción del proyecto: Idea de proyecto
SportSync nace como una plataforma digital diseñada para unificar la oferta deportiva y eliminar la 
fragmentación del sector, conectando directamente a deportistas con centros e instructores 
independientes. El núcleo de la propuesta es resolver la frustración de quienes mantienen un estilo 
de vida activo y dinámico, especialmente aquellos usuarios que viajan con frecuencia y necesitan 
mantener sus rutinas de entrenamiento en ciudades desconocidas. Al integrar la búsqueda, la reserva 
y el pago en una sola interfaz, el proyecto sustituye el proceso tedioso de realizar llamadas 
telefónicas o navegar por múltiples webs locales por una experiencia inmediata de pocos clics, 
permitiendo que cualquier persona encuentre el servicio que necesita, desde una pista de pádel hasta 
un entrenador personal, sin importar su ubicación geográfica.

# 🚀 Creación del diseño y uso de la base de datos:
En este SprintZero hemos optado por una metodología que combina el trabajo colaborativo en el diseño con la especialización en el desarrollo de la infraestructura:
Todos los miembros del equipo participamos activamente en el diseño de los mockups en Figma y la definición de las historias de usuario en 
Miro. La traducción de los diseños a código (HTML y CSS) fue realizada de forma conjunta por la mayoría del equipo. También, la configuración y gestión 
de la base de datos en Firebase. Su enfoque permitió establecer una arquitectura de datos sólida para que el resto del equipo pudiera integrar las 
funcionalidades dinámicas de JavaScript sobre una base estable. Por último, la organización de tareas en Trello, el control de versiones en Git y la 
redacción de los archivos .feature (Gherkin) fueron tareas para asegurar la calidad del código y el cumplimiento de los objetivos.

* **Enlace Figma:** https://www.figma.com/design/932AGbsgEWwMm1Z0YmgsVN/PS_Grupo10?node-id=0-1&p=f&t=6bSn1NRW8zx32zGa-0
* **Enlace Miro:** https://miro.com/app/board/uXjVG1yS6hY=/
* **Enlace Trello:** https://trello.com/b/YhTRWdFz/sport-sync

**👨‍💻 Repositorio GitHub:** https://github.com/Diegogonzalezm2022/Sportsync

# ⭐ Logros del Sprint Zero:
Durante este sprint se han sentado las bases del sistema, logrando implementar y validar mediante tests BDD con Cucumber las siguientes funcionalidades:
* -Gestión de centros y profesionales: Se puede dar de alta gimnasios (HU16) y contratar profesionales (HU15), ambos verificados contra la base de datos Firebase.
* -Localización: Los usuarios pueden buscar centros por proximidad geográfica (HU01), validando distancias en distintas direcciones.
* -Sistema de reservas: Se implementó la reserva de actividades (HU02) y su cancelación (HU10), actualizando correctamente el estado en la base de datos.
* -Control de aforo: El sistema actualiza automáticamente los huecos disponibles tanto al reservar (HU20) como al cancelar (HU21).
* -Creación de servicios: Los centros y profesionales pueden crear actividades (HU25).-Límite de cancelaciones: Se estableció un control por fecha límite que impide cancelar reservas fuera de plazo (HU18).

# 💻 Tecnologías
* HTML5 (Estructura y Formularios)
* CSS3 (Estilos del código)
* Figma (Prototipado / Mockups)
* Javascript Vanilla (Dinamicidad)
* Firebase (Base de datos)
* Gherkin (Escenarios de prueba)

