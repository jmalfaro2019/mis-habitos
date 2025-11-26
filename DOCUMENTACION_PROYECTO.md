# Documentación del Proyecto: Mis Hábitos

Este documento proporciona una visión detallada de la estructura, arquitectura, servicios y funcionalidades del proyecto "Mis Hábitos".

## 1. Descripción General
"Mis Hábitos" es una aplicación web diseñada para ayudar a los usuarios a gestionar y realizar un seguimiento de sus hábitos diarios. Además, incorpora características sociales y de gamificación (retos) para fomentar la motivación.

## 2. Estructura del Proyecto
El proyecto sigue una estructura estándar de una aplicación React creada con Vite.

```
mis-habitos/
├── .github/                # Configuraciones de GitHub (ej. workflows de despliegue)
├── public/                 # Archivos estáticos públicos
├── src/                    # Código fuente de la aplicación
│   ├── assets/             # Recursos estáticos (imágenes, iconos)
│   ├── components/         # Componentes de React reutilizables y modulares
│   ├── hooks/              # Custom Hooks para lógica de negocio reutilizable
│   ├── App.jsx             # Componente principal y enrutador básico
│   ├── main.jsx            # Punto de entrada de la aplicación
│   ├── index.css           # Estilos globales y configuración de Tailwind
│   └── ...
├── .gitignore              # Archivos ignorados por Git
├── eslint.config.js        # Configuración de ESLint (calidad de código)
├── index.html              # Archivo HTML principal
├── package.json            # Dependencias y scripts del proyecto
├── tailwind.config.js      # Configuración de Tailwind CSS
└── vite.config.js          # Configuración de Vite (empaquetador)
```

## 3. Arquitectura y Tecnologías

### Frontend
-   **React (v19)**: Biblioteca principal para construir la interfaz de usuario basada en componentes.
-   **Vite**: Herramienta de construcción (bundler) rápida y moderna.
-   **Tailwind CSS**: Framework de CSS "utility-first" para el diseño y estilizado rápido.
-   **Lucide React**: Biblioteca de iconos vectoriales.

### Backend (Backend-as-a-Service)
-   **Firebase**: Plataforma de Google que proporciona la infraestructura backend.
    -   **Authentication**: Gestión de usuarios (registro, inicio de sesión).
    -   **Firestore**: Base de datos NoSQL en tiempo real para almacenar datos de usuarios, hábitos, retos, etc.

### Flujo de Datos
La aplicación utiliza un flujo de datos unidireccional típico de React. El estado global de autenticación se maneja en `App.jsx` y se distribuye a los componentes hijos. Para la gestión de datos complejos (hábitos, retos), se utilizan **Custom Hooks** (`useHabits`, `useChallenges`) que encapsulan la lógica de interacción con Firebase.

## 4. Servicios (Firebase)

### Authentication
Se utiliza `firebase/auth` para manejar la autenticación mediante correo electrónico y contraseña.
-   `signInWithEmailAndPassword`: Iniciar sesión.
-   `createUserWithEmailAndPassword`: Registrar nuevos usuarios.
-   `onAuthStateChanged`: Escuchar cambios en el estado de la sesión (persistencia).

### Firestore Database
Se utiliza `firebase/firestore` como base de datos.
-   **Colecciones principales** (deducidas del código):
    -   `users`: Perfiles de usuario.
    -   `habits`: Hábitos creados por los usuarios.
    -   `challenges`: Retos disponibles.
    -   `notifications`: Sistema de notificaciones.

## 5. Funcionalidades Detalladas

### Gestión de Usuarios
-   **Registro e Inicio de Sesión**: Los usuarios pueden crear una cuenta y acceder a ella.
-   **Perfil de Usuario**: Visualización y edición de datos del perfil (`UserProfile.jsx`).

### Gestión de Hábitos (`HabitManager.jsx`, `useHabits.js`)
-   **Crear Hábito**: Los usuarios pueden definir nuevos hábitos.
-   **Seguimiento**: Marcar hábitos como completados.
-   **Visualización**: Ver lista de hábitos activos.

### Retos (`ChallengeList.jsx`, `ChallengeDetail.jsx`, `useChallenges.js`)
-   **Explorar Retos**: Ver retos disponibles creados por la comunidad o el sistema.
-   **Crear Retos**: Los usuarios pueden proponer nuevos retos (`CreateChallengeModal.jsx`).
-   **Detalle del Reto**: Ver información específica y progreso de un reto.

### Espacio de Pareja (`CoupleSpace.jsx`)
-   Funcionalidad dedicada para compartir hábitos o retos con una pareja (funcionalidad sugerida por el nombre del archivo).

### Social (`SocialSidebar.jsx`, `SocialModal.jsx`)
-   Interacción con otros usuarios, posiblemente sistema de seguidores/seguidos o compartir logros.

### Notificaciones (`NotificationsPanel.jsx`)
-   Sistema para alertar al usuario sobre eventos importantes (ej. recordatorios, interacciones sociales).

## 6. Lenguajes de Programación

### JavaScript (JSX)
Es el lenguaje principal del proyecto.
-   **Uso**: Lógica de la aplicación, definición de componentes, interacción con la API de Firebase.
-   **JSX**: Extensión de sintaxis que permite escribir estructuras tipo HTML dentro de JavaScript.
-   **Ejemplo**:
    ```jsx
    const [user, setUser] = useState(null); // Lógica de estado
    return <div>Hola {user.name}</div>; // Renderizado (JSX)
    ```

### CSS (Tailwind)
-   **Uso**: Estilizado de la interfaz.
-   **Enfoque**: En lugar de escribir archivos CSS largos, se usan clases utilitarias directamente en el JSX (ej. `className="p-4 bg-blue-500 text-white"`).

### HTML
-   **Uso**: Estructura base del documento (`index.html`) donde se "monta" la aplicación React.

## 7. Explicación del Código (Componentes Clave)

### `App.jsx`
Es el "cerebro" inicial de la aplicación.
1.  Inicializa Firebase.
2.  Escucha el estado de autenticación (`onAuthStateChanged`).
3.  Decide qué vista mostrar: `LoginRegister` (si no hay usuario) o `HabitManager` (si hay usuario).
4.  Carga el perfil extendido del usuario desde Firestore.

### `hooks/useHabits.js` y `hooks/useChallenges.js`
Son la capa de lógica de negocio. Separan la lógica de la base de datos de la interfaz gráfica.
-   Contienen funciones como `addHabit`, `deleteHabit`, `fetchChallenges`.
-   Usan `useEffect` para suscribirse a cambios en tiempo real en la base de datos.

### `components/LoginRegister.jsx`
Maneja los formularios de entrada.
-   Alterna entre vista de Login y Registro.
-   Valida errores básicos y llama a las funciones `onLogin` o `onRegister` pasadas desde `App.jsx`.

### `components/HabitManager.jsx`
Es el panel principal (Dashboard).
-   Orquesta la visualización de los hábitos, el menú lateral, y el contenido principal según la navegación interna del usuario.
