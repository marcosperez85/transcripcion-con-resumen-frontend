export function getAudioDuration(file) {

  return new Promise((resolve, reject) => {

    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.src = url;

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      reject(new Error("No se pudo leer la duración del audio"));
    };

  });

}