import React, { useState, useEffect } from "react";
import mqtt from "mqtt";
import axios from "axios"; // Import axios để gửi yêu cầu HTTP

const App = () => {
  const [mqttClient, setMqttClient] = useState(null);
  const [targetHour, setTargetHour] = useState(0); // Lưu giờ
  const [targetMinute, setTargetMinute] = useState(0); // Lưu phút
  const [targetSecond, setTargetSecond] = useState(0); // Lưu giây
  const [sensorData, setSensorData] = useState({
    temperature: "--",
    humidity: "--",
    concentration: "--",
    foodRate: "--",
    waterRate: "--",    
  });
  

  const [deviceStates, setDeviceStates] = useState({
    quat: "off",  
    maybom: "off",
    den: "off",
    servo: "off",
  });
  const [fanMode, setFanMode] = useState("MANUAL"); // Trạng thái quạt
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString()); // Thời gian thực

  useEffect(() => {
    const clientId = "client" + Math.random().toString(36).substring(7);
    const host = "ws://broker.emqx.io:8083/mqtt";

    const options = {
      keepalive: 60,
      clientId: clientId,
      protocolId: "MQTT",
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    };

    const client = mqtt.connect(host, options);

    client.on("connect", () => {
      console.log("Client connected: " + clientId);
      client.subscribe("esp32/temp", { qos: 0 });
      client.subscribe("esp32/hum", { qos: 0 });
      client.subscribe("esp32/air", { qos: 0 });
      client.subscribe("esp32/foodrate", { qos: 0 });
      client.subscribe("esp32/waterrate", { qos: 0 });
      client.subscribe("esp32/quat/control", { qos: 0 });
      client.subscribe("esp32/maybom/control", { qos: 0 });
      client.subscribe("esp32/den/control", { qos: 0 });
      client.subscribe("esp32/servo/control", { qos: 0 });
      client.subscribe("esp32/fan/mode", { qos: 0 }); // Subscribe trạng thái quạt
    });

    client.on("message", (topic, message) => {
      const msg = message.toString();
      if (topic === "esp32/temp") {
        setSensorData((prev) => ({ ...prev, temperature: msg }));
      } else if (topic === "esp32/hum") {
        setSensorData((prev) => ({ ...prev, humidity: msg }));
      } else if (topic === "esp32/air") {
        setSensorData((prev) => ({ ...prev, concentration: msg }));
      } else if (topic === "esp32/foodrate") {
        setSensorData((prev) => ({ ...prev, foodRate: msg }));
      } else if (topic === "esp32/waterrate") {
        setSensorData((prev) => ({ ...prev, waterRate: msg }));
      } else if (topic.includes("/control")) {
        const device = topic.split("/")[1];
        setDeviceStates((prev) => ({
          ...prev,
          [device]: msg.trim().toLowerCase(),
        }));
      } else if (topic === "esp32/fan/mode") {
        setFanMode(msg.trim().toUpperCase()); // Cập nhật trạng thái quạt (MANUAL/AUTOMATIC)
      }
    });

    setMqttClient(client);

    // Ghi dữ liệu vào MySQL mỗi 2 giờ
    const saveDataToDatabase = () => {
      const { temperature, humidity, concentration, foodRate, waterRate } = sensorData;
      // Gửi yêu cầu POST đến server
      axios.post('http://localhost:3000/api/sensor-data', {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        concentration: parseFloat(concentration),
        foodRate: parseFloat(foodRate),
        waterRate: parseFloat(waterRate),
      })
      .then(response => {
        console.log('Dữ liệu đã được ghi vào cơ sở dữ liệu:', response.data);
      })
      .catch(error => {
        console.error('Lỗi khi ghi dữ liệu:', error);
      });
    };

    // Thiết lập timer để gọi saveDataToDatabase mỗi 2 giờ (7200000 ms)
    const intervalId = setInterval(saveDataToDatabase, 30000);

    // Cập nhật thời gian thực mỗi giây
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      client.end();
      clearInterval(intervalId); // Dọn dẹp interval khi component unmount
      clearInterval(timeInterval); // Dọn dẹp interval cho thời gian thực
    };
  }, [sensorData]); // Thêm sensorData vào dependency array để ghi dữ liệu khi có thay đổi

  const toggleDevice = (device) => {
    const newState = deviceStates[device] === "on" ? "off" : "on";
    if (mqttClient) {
      mqttClient.publish(`esp32/${device}/control`, newState.toUpperCase());
    }
    setDeviceStates((prev) => ({
      ...prev,
      [device]: newState,
    }));
  };
  

  const deviceNames = {
    quat: "Quạt",
    maybom: "Máy bơm",
    den: "Đèn",
    servo: "Servo",
  };

  // Hàm gửi thời gian tới các topic MQTT
  const handleTimeSubmit = () => {
    if (mqttClient) {
      mqttClient.publish("targetHour", targetHour.toString());
      mqttClient.publish("targetMinute", targetMinute.toString());
      mqttClient.publish("targetSecond", targetSecond.toString());
      console.log(`Đã gửi thời gian: ${targetHour}:${targetMinute}:${targetSecond}`);
    }
  };

  return (
    <div className="container">
      <h1>Đồ án PBL3</h1>

      {/* Hiển thị thời gian thực */}
      <div className="real-time">
        <h2>Thời gian hiện tại: {currentTime}</h2>
      </div>

      {/* Hiển thị trạng thái quạt */}
      <div className="fan-status">
        <h3>Trạng thái quạt: {fanMode === "MANUAL" ? "Thủ công" : "Tự động"}</h3>
      </div>

      <div className="devices-grid">
        {["quat", "maybom", "den", "servo"].map((device, idx) => (
          <div className="device" key={idx}>
            <h3>{deviceNames[device]}</h3>
            <button
              className={`device-btn ${deviceStates[device]}`}
              onClick={() => toggleDevice(device)}
            >
              {deviceStates[device] === "on" ? "Tắt" : "Bật"} {deviceNames[device]}
            </button>
          </div>
        ))}
      </div>

      {/* Form nhập thời gian */}
      <div className="time-setting">
        <h2> Đặt thời gian cho ăn</h2>
        <div className="time-inputs">
          <label>
            Giờ:
            <input
              type="number"
              value={targetHour}
              onChange={(e) => setTargetHour(Number(e.target.value))}
              min="0"
              max="23"
            />
          </label>
          <label>
            Phút:
            <input
              type="number"
              value={targetMinute}
              onChange={(e) => setTargetMinute(Number(e.target.value))}
              min="0"
              max="59"
            />
          </label>
          <label>
            Giây:
            <input
              type="number"
              value={targetSecond}
              onChange={(e) => setTargetSecond(Number(e.target.value))}
              min="0"
              max="59"
            />
          </label>
        </div>
        <button onClick={handleTimeSubmit}>Gửi Thời Gian</button>
      </div>


      

      {/* Khung thông tin cảm biến */}
      <div className="sensor-info">
        <h2>Thông tin cảm biến</h2>
        <div className="sensor-grid">
          <div className="sensor-item">
            <i className="fas fa-thermometer-half"></i>
            <p>Nhiệt độ</p>
            <span>{sensorData.temperature}°C</span>
          </div>
          <div className="sensor-item">
            <i className="fas fa-tint"></i>
            <p>Độ ẩm</p>
            <span>{sensorData.humidity}%</span>
          </div>
          <div className="sensor-item">
            <i className="fas fa-smog"></i>
            <p>Nồng độ</p>
            <span>{sensorData.concentration}ppm</span>
          </div>
        </div>
      </div>
      

      {/* Khung thông tin thức ăn và nước uống */}
      <div className="food-water-info">
        <h2>Thông tin thức ăn và nước uống</h2>
        <div className="food-water-grid">
          <div className="food-water-item">
            <i className="fas fa-drumstick-bite"></i>
            <p>Tỉ lệ thức ăn</p>
            <span>{sensorData.foodRate} %</span>
          </div>
          <div className="food-water-item">
            <i className="fas fa-water"></i>
            <p>Tỉ lệ nước uống</p>
            <span>{sensorData.waterRate} %</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
