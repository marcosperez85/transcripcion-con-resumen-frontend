# Transcripción con Resumen / Audio Transcription with Summary

[English](#english) | [Español](#español)

## Español

### ¿Qué hace este proyecto?

Este proyecto es una aplicación web que permite **transcribir archivos de audio automáticamente** y generar resúmenes de las transcripciones. La aplicación utiliza servicios de AWS para procesar los archivos de audio y generar transcripciones con identificación de hablantes.

### Características principales:

- **Subida de archivos de audio** a AWS S3
- **Transcripción automática** usando AWS Transcribe
- **Identificación de hablantes** (speaker diarization)
- **Soporte multiidioma** (español, inglés, etc.)
- **Interfaz web moderna** con Bootstrap
- **Formateo de transcripciones**

### Estructura del proyecto

```
transcripcion-con-resumen-frontend/
├── frontend/                    # Aplicación web frontend
│   └── src/
│       ├── main.js             # Lógica principal de la aplicación
│       ├── s3Upload.js         # Subida de archivos a S3
│       ├── transcribe.js       # Inicio de transcripción
│       ├── formatear.js        # Formateo de transcripciones
│       └── cognitoAuth.js      # Autenticación (no mostrado)
├── infra/                      # Infraestructura CDK
│   └── infra/
│       └── infra_stack.py      # Stack de infraestructura AWS
└── README.md                   # Este archivo
```

### Instalación y configuración

#### Prerrequisitos
- Node.js (versión 14 o superior)
- Python 3.8+
- AWS CLI configurado
- Cuenta de AWS

#### 1. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

#### 2. Configurar infraestructura CDK

```bash
# Crear entorno virtual de Python
cd infra
python -m venv .venv

# Activar entorno virtual
# En Windows:
.venv\Scripts\activate
# En macOS/Linux:
source .venv/bin/activate

# Instalar dependencias de CDK
pip install -r requirements.txt

# Instalar AWS CDK (si no está instalado)
npm install -g aws-cdk

# Verificar instalación
cdk --version
```

#### 3. Desplegar infraestructura

```bash
# Desde la carpeta infra/
cdk bootstrap  # Solo la primera vez
cdk deploy
```

### Uso de la aplicación

1. Abre la aplicación web en tu navegador
2. Selecciona un archivo de audio
3. Elige el idioma (ej: es-ES para español, en-US para inglés)
4. Indica el número de hablantes
5. Haz clic en enviar para iniciar la transcripción

### Tecnologías utilizadas

- **Frontend**: JavaScript vanilla, Bootstrap, AWS SDK
- **Backend**: AWS Lambda, API Gateway
- **Almacenamiento**: AWS S3
- **Transcripción**: AWS Transcribe
- **Infraestructura**: AWS CDK (Python)

---

## English

### What does this project do?

This project is a web application that allows you to **automatically transcribe audio files** and generate summaries of the transcriptions. The application uses AWS services to process audio files and generate transcriptions with speaker identification.

### Main features:

- **Audio file upload** to AWS S3
- **Automatic transcription** using AWS Transcribe
- **Speaker identification** (speaker diarization)
- **Multi-language support** (Spanish, English, etc.)
- **Modern web interface** with Bootstrap
- **Transcription formatting**

### Project structure

```
transcripcion-con-resumen-frontend/
├── frontend/                    # Frontend web application
│   └── src/
│       ├── main.js             # Main application logic
│       ├── s3Upload.js         # S3 file upload
│       ├── transcribe.js       # Transcription initiation
│       ├── formatear.js        # Transcription formatting
│       └── cognitoAuth.js      # Authentication (not shown)
├── infra/                      # CDK Infrastructure
│   └── infra/
│       └── infra_stack.py      # AWS infrastructure stack
└── README.md                   # This file
```

### Installation and setup

#### Prerequisites
- Node.js (version 14 or higher)
- Python 3.8+
- AWS CLI configured
- AWS Account

#### 1. Install frontend dependencies

```bash
cd frontend
npm install
```

#### 2. Set up CDK infrastructure

```bash
# Create Python virtual environment
cd infra
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install CDK dependencies
pip install -r requirements.txt

# Install AWS CDK (if not installed)
npm install -g aws-cdk

# Verify installation
cdk --version
```

#### 3. Deploy infrastructure

```bash
# From the infra/ folder
cdk bootstrap  # Only the first time
cdk deploy
```

### How to use the application

1. Open the web application in your browser
2. Select an audio file
3. Choose the language (e.g., es-ES for Spanish, en-US for English)
4. Specify the number of speakers
5. Click submit to start transcription

### Technologies used

- **Frontend**: Vanilla JavaScript, Bootstrap, AWS SDK
- **Backend**: AWS Lambda, API Gateway
- **Storage**: AWS S3
- **Transcription**: AWS Transcribe
- **Infrastructure**: AWS CDK (Python)

### API Endpoint

The application communicates with the backend through:
- **API URL**: `https://yfoulcwp9a.execute-api.us-east-1.amazonaws.com/prod/transcribir`
- **S3 Bucket**: `transcripcion-con-resumen-backend`
- **Region**: `us-east-1`

### Configuration

Make sure to configure the following before deployment:
- AWS credentials and region
- S3 bucket CORS policy for frontend uploads
- Cognito authentication setup (referenced in `cognitoAuth.js`)