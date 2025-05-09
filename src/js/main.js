import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


const $formulario = document.getElementById('uploadForm');

$formulario.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('audioFile');
  const idiomaInput = document.getElementById('idioma');
  const speakersInput = document.getElementById('speakers');

  if (!fileInput.files.length) {
    alert("Por favor seleccioná un archivo");
    return;
  }

  if (!idiomaInput.value.trim()) {
    alert("Por favor ingresá un idioma válido (por ejemplo, es-ES para español o en-US para inglés).");
    return;
  }

  const file = fileInput.files[0];
  const key = `audios/${file.name}`;
  const idioma = idiomaInput.value;
  const speakers = parseInt(speakersInput.value);

  try {
    await uploadFileToS3(file, key);
    console.log("Archivo subido correctamente");

    const transcripcion = await iniciarTranscripcion("transcripcion-con-resumen", key, idioma, speakers);
    console.log("Transcripción iniciada:", transcripcion);
  } catch (error) {
    console.error("Error:", error);
  }
});
