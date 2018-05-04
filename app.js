(function() {

  var MODEL_PATH = 'model/mobilenet.json';
  var CLASSES_PATH = 'model/mobilenet.classes.json';
  var IMAGE_SIZE = 224; // Required by this model
  var PREDICT_INTERVAL = 1000; // Delay between predictions in milliseconds
  var MAX_CLASSES = 8;

  var overlayDialog = document.querySelector('#overlay .dialog');
  var camera = document.getElementById('camera');
  var notification = new Audio('notification.ogg');
  notification.preload = 'auto';

  var model, modelClasses;
  var lastCheck = null;


  /**
   * Update UI
   * @param {Boolean} isHotdog Is hotdog
   */
  function updateUI(isHotdog) {
    if (lastCheck == isHotdog) return;

    // Update result overlay
    var result = document.querySelector('#overlay .result');
    if (isHotdog) {
      result.classList.remove('not-hotdog');
      result.classList.add('hotdog');
      result.innerHTML = 'Hotdog!';

      // Play sound
      notification.play();
    } else {
      result.classList.remove('hotdog');
      result.classList.add('not-hotdog');
      result.innerHTML = 'Not Hotdog!';
    }
    result.style.display = 'block';

    // Update last state
    lastCheck = isHotdog;
  }


  /**
   * Get camera image
   * @return {HTMLCanvasElement} Canvas with image
   */
  function getCameraImage() {
    var c = document.createElement('canvas');
    c.width = IMAGE_SIZE;
    c.height = IMAGE_SIZE;
    c.getContext('2d').drawImage(camera, 0, 0, c.width, c.height);
    return c;
  }


  /**
   * Connect to camera
   * @async
   * @return {Promise} Callback
   */
  function connectToCamera() {
    return new Promise(function(resolve, reject) {
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // For phones, prefer main camera
        }
      }).then(function(stream) {
        // Start rendering camera
        var streamURL = window.URL.createObjectURL(stream);
        try {
          camera.srcObject = streamURL;
        } catch (e) {
          camera.src = streamURL;
        }

        // Resolve promise
        resolve();
      }).catch(reject);
    });
  }


  /**
   * Load model
   * @async
   * @return {Promise} Callback
   */
  function loadModel() {
    return new Promise(function(resolve, reject) {
      tf.loadModel(MODEL_PATH).then(function(m) {
        model = m;
        fetch(CLASSES_PATH).then(function(res) {
          res.json().then(function(json) {
            modelClasses = json;
            resolve();
          });
        });
      }).catch(reject);
    });
  }


  /**
   * Start predicting
   */
  function startPredicting() {
    predict().then(function(isHotdog) {
      // Update UI
      if (isHotdog) console.log('Hotdog found!');
      updateUI(isHotdog);

      // Schedule next prediction
      setTimeout(function() {
        startPredicting();
      }, PREDICT_INTERVAL);
    });
  }


  /**
   * Predict
   * @async
   * @return {Promise<Boolean>} Is hotdog
   */
  function predict() {
    return new Promise(function(resolve, reject) {
      tf.tidy(function() {
        // Get camera pixels and covert them to a tensor
        var image = tf.fromPixels(getCameraImage()).toFloat();

        // Change coordinates from [0,255] to [-1,1]
        var offset = tf.scalar(127.5);
        image = image.sub(offset).div(offset);

        // Convert linear array to matrix
        image = image.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

        // Make a prediction using loaded model
        var logits = model.predict(image);
        getTopClasses(logits, MAX_CLASSES).then(function(classes) {
          console.log('Found classes', classes);

          // Validate whether is Hotdog or Not Hotdog
          var isHotdog = false;
          for (var i=0; i<classes.length; i++) {
            if (classes[i].name.indexOf('hotdog') > -1) {
              isHotdog = true;
              break;
            }
          }
          resolve(isHotdog);
        });
      });
    });
  }


  /**
   * Get top classes
   * @param  {tf.Tensor}      logits     Logits returned by model
   * @param  {Integer}        maxClasses Maximum number of classes to return
   * @return {Promise<Array>}            Top classes
   */
  function getTopClasses(logits, maxClasses) {
    return new Promise(function(resolve, reject) {
      // Get raw data from logits
      logits.data().then(function(values) {
        // Sort data by value, while keeping index
        var sortedData = [];
        for (var i=0; i<values.length; i++) {
          sortedData.push({value: values[i], index: i});
        }
        sortedData.sort(function(a, b) {
          return b.value - a.value;
        });

        // Get top entries
        var topValues = new Float32Array(maxClasses);
        var topIndices = new Int32Array(maxClasses);
        for (var i=0; i<maxClasses; i++) {
          topValues[i] = sortedData[i].value;
          topIndices[i] = sortedData[i].index;
        }

        // Get top classes name
        var topClasses = [];
        for (var i=0; i<topIndices.length; i++) {
          topClasses.push({
            name: modelClasses[topIndices[i]],
            probability: topValues[i]
          });
        }
        resolve(topClasses);
      });
    });
  }


  /* INITIALIZE */
  connectToCamera().then(function() {
    overlayDialog.innerHTML = 'Cargando modelo...';
    loadModel().then(function() {
      overlayDialog.style.display = 'none';
      startPredicting();
    });
  }).catch(function() {
    overlayDialog.innerHTML = 'Esta app necesita acceder a la cámara de ' +
      'tu dispositivo para funcionar';
  });

})();
