let mqttClient;

window.addEventListener("load", (event) => {
  connectToBroker();
  
  // Thiết lập trạng thái mặc định của các nút là "Bật thiết bị"
  const toggleDevice1Btn = document.querySelector("#toggleDevice1Btn");
  const toggleDevice2Btn = document.querySelector("#toggleDevice2Btn");
  const toggleDevice3Btn = document.querySelector("#toggleDevice3Btn");
  const toggleDevice4Btn = document.querySelector("#toggleDevice4Btn");
  
  toggleDevice1Btn.textContent = "Bật thiết bị";
  toggleDevice2Btn.textContent = "Bật thiết bị";
  toggleDevice3Btn.textContent = "Bật thiết bị";
  toggleDevice4Btn.textContent = "Bật thiết bị";


  toggleDevice1Btn.classList.add("off"); // Trạng thái ban đầu là "off"
  toggleDevice2Btn.classList.add("off");
  toggleDevice3Btn.classList.add("off");
  toggleDevice4Btn.classList.add("off");


  toggleDevice1Btn.addEventListener("click", () => {
    toggleDevice(toggleDevice1Btn, "esp32/quat/control");
  });

  toggleDevice2Btn.addEventListener("click", () => {
    toggleDevice(toggleDevice2Btn, "esp32/maybom/control");
  });

  toggleDevice3Btn.addEventListener("click", () => {
    toggleDevice(toggleDevice3Btn, "esp32/den/control");
  });

  toggleDevice4Btn.addEventListener("click", () => {
    toggleDevice(toggleDevice4Btn, "esp32/servo/control");
  });
});

function connectToBroker() {
  const clientId = "client" + Math.random().toString(36).substring(7);
  const host = 'ws://broker.emqx.io:8083/mqtt';

  const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: "MQTT",
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  };

  mqttClient = mqtt.connect(host, options);

  mqttClient.on("error", (err) => {
    console.log("Error: ", err);
    mqttClient.end();
  });

  mqttClient.on("reconnect", () => {
    console.log("Reconnecting...");
  });

  mqttClient.on("connect", () => {
    console.log("Client connected: " + clientId);
    mqttClient.subscribe("esp32/quat/control", { qos: 0 });
    mqttClient.subscribe("esp32/maybom/control", { qos: 0 });
    mqttClient.subscribe("esp32/den/control", { qos: 0 });
    mqttClient.subscribe("esp32/servo/control", { qos: 0 });
    mqttClient.subscribe("esp32/temp", { qos: 0 });
    mqttClient.subscribe("esp32/hum", { qos: 0 });
    mqttClient.subscribe("esp32/air", { qos: 0 });
  });

  mqttClient.on("message", (topic, message) => {
    const messageStr = message.toString();
    console.log("Received Message: " + messageStr + "\nOn topic: " + topic);
    
    // Cập nhật trạng thái nút bấm dựa trên topic và message
    if (topic === "esp32/quat/control") {
      updateButtonState(document.querySelector("#toggleDevice1Btn"), messageStr);
    } else if (topic === "esp32/maybom/control") {
      updateButtonState(document.querySelector("#toggleDevice2Btn"), messageStr);
    } else if (topic === "esp32/den/control") {
      updateButtonState(document.querySelector("#toggleDevice3Btn"), messageStr);
    } else if (topic === "esp32/servo/control") {
      updateButtonState(document.querySelector("#toggleDevice4Btn"), messageStr);
    }

    // Cập nhật giá trị bảng nhiệt độ, độ ẩm và nồng độ
    if (topic === "esp32/temp") {
      document.getElementById("temperature").textContent = messageStr + " °C";
    } else if (topic === "esp32/hum") {
      document.getElementById("humidity").textContent = messageStr + " %";
    } else if (topic === "esp32/air") {
      document.getElementById("concentration").textContent = messageStr;
    }
  });
}

function toggleDevice(button, topic) {
  let message;
  if (button.classList.contains("on")) {
    message = "OFF";
    button.classList.remove("on");
    button.classList.add("off");
    button.textContent = "Bật thiết bị";
  } else {
    message = "ON";
    button.classList.remove("off");
    button.classList.add("on");
    button.textContent = "Tắt thiết bị";
  }

  mqttClient.publish(topic, message, {
    qos: 0,
    retain: false,
  });
  console.log(`Sent ${message} command to ${topic}`);
}

function updateButtonState(button, message) {
  console.log("Updating button state: ", message);
  if (message.trim() === "ON") {
    button.classList.remove("off");
    button.classList.add("on");
    button.textContent = "Tắt thiết bị";
  } else if (message.trim() === "OFF") {
    button.classList.remove("on");
    button.classList.add("off");
    button.textContent = "Bật thiết bị";
  }
}
