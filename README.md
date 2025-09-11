# 🐝 Prevention of Mold in Beehives

## 📌 Project Overview  
Mold growth in beehives is a major concern for beekeepers, impacting colony health, reducing honey production, and leading to potential colony collapse. This project presents an **IoT-based system** to monitor and regulate hive conditions, preventing mold formation.


1. Log in to our website using the credentials:

    User name: testesT1

    Email: test@gmail.com

    Password: testesT1


2. Explore the following features:
     - Add and monitor all hives condition at the same time.
     - View real-time humidity and temperature data inside each hive separately.
     - Observe air pump activations triggered by environmental conditions. 
     - Download or view daily reports.
     - Explore historical graph.
     - Check last air pump activations table.

Website: https://prevention-of-mold-in-beehives-sf98.vercel.app/


---

## 🚀 Features  
✅ **Real-time Monitoring**: Tracks temperature and humidity inside the beehive.  
✅ **Automated Alerts**: Sends notifications when conditions favor mold growth.  
✅ **Data Visualization**: Displays real-time and historical data using interactive charts.  
✅ **Remote Access**: Cloud-based storage ensures data accessibility from anywhere.  

---
### IoT & Communication:  
- **MQTT Protocol** (Real-time data transmission)  
- **4G Modem & Wi-Fi** (Data communication)  

---

## 🎯 System Architecture  
```
[ Sensors ] → [ M5Stack ] → [ 4G modem ] → [ Cloud Storage (MongoDB) ] → [ Web Dashboard ]
```
1. **Sensors** (Temperature & Humidity) collect data from the hive.  
2. **Data Transmission** via MQTT using 4G modem to a central device (M5Stack).  
3. **Cloud Storage** (MongoDB) for long-term data retention.  
4. **User Dashboard** displays graphs & alerts using Next.js.  

---

## 📸 Screenshots  
-DARK MODE-
<img width="1691" alt="Screenshot 2025-03-13 at 2 34 02" src="https://github.com/user-attachments/assets/94a992eb-8d46-4552-8e60-2a6b34b4d137" />
<img width="1689" alt="Screenshot 2025-03-13 at 2 34 37" src="https://github.com/user-attachments/assets/e2f9430f-6538-4399-b704-19d9d8294eee" />
<img width="1691" alt="Screenshot 2025-03-13 at 2 35 02" src="https://github.com/user-attachments/assets/092fafec-338c-4226-8932-da40f6c9453d" />
<img width="1689" alt="Screenshot 2025-03-13 at 2 35 40" src="https://github.com/user-attachments/assets/7e72a285-8c5a-4318-94c3-8824be548001" />
<img width="1692" alt="Screenshot 2025-03-13 at 2 36 09" src="https://github.com/user-attachments/assets/be6e94d7-8584-42fb-a025-9780c1887868" />
<img width="1705" alt="Screenshot 2025-03-13 at 2 37 02" src="https://github.com/user-attachments/assets/5ca7e633-1e77-47d3-9076-6ddfc5ba0316" />
<img width="1686" alt="Screenshot 2025-03-13 at 2 37 49" src="https://github.com/user-attachments/assets/d6fcd840-f71e-459b-a3fe-c4ec6057ae0d" />
<img width="1687" alt="Screenshot 2025-03-13 at 2 38 36" src="https://github.com/user-attachments/assets/c6dc734a-8f15-4cb2-965a-c5d657f7ceb5" />


-LIGHT MODE-
<img width="1452" alt="Screenshot 2025-03-08 at 18 54 33" src="https://github.com/user-attachments/assets/8fa6d744-ff15-47c8-9c13-60018c98d850" />
<img width="1451" alt="Screenshot 2025-03-08 at 18 55 13" src="https://github.com/user-attachments/assets/3e558730-d921-43c9-b45e-e8c0820f5f4d" />
<img width="1451" alt="Screenshot 2025-03-08 at 18 55 51" src="https://github.com/user-attachments/assets/4cb77a3f-fc0e-4859-9a42-bb3efab80874" />
<img width="1451" alt="Screenshot 2025-03-08 at 18 56 37" src="https://github.com/user-attachments/assets/71faef9a-0997-47a3-8cf0-15dd4c3fcd0b" />
<img width="1450" alt="Screenshot 2025-03-08 at 18 57 04" src="https://github.com/user-attachments/assets/520d0d83-d676-43a1-8f28-a2d58e6e7b78" />
<img width="1450" alt="Screenshot 2025-03-08 at 18 57 38" src="https://github.com/user-attachments/assets/f5926863-9fed-4e47-b7aa-a50958edf2e5" />
<img width="1451" alt="Screenshot 2025-03-08 at 18 58 05" src="https://github.com/user-attachments/assets/990269b4-58b1-4570-b0b6-150ca1e5a54b" />
<img width="1392" alt="Screenshot 2025-03-08 at 18 59 04" src="https://github.com/user-attachments/assets/90353c4d-e83a-4dec-ba5e-7ca0b751e4fe" />


---

## 📥 Installation & Setup  
-Not Yet-

### 4️⃣ Set up MQTT broker & 4G modem connectivity.  
### 5️⃣ Connect the sensors and ensure data transmission is active.  

---

## 🧪 Testing  
The system is tested for:  
- ✅ **Data accuracy** (temperature & humidity readings)  
- ✅ **Response time** (sensor-to-dashboard updates)  
- ✅ **UI functionality** (dashboard & alerts)  

---
