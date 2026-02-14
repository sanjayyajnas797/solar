import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function DeviceDashboard() {

  const { stationId } = useParams();

  const [device, setDevice] = useState(null);

  useEffect(() => {

    fetch(`http://localhost:5000/api/devices/${stationId}`)
      .then(res => res.json())
      .then(data => {

        const inverter =
          data.deviceListItems.find(
            d => d.deviceType === "INVERTER"
          );

        fetch(
          `http://localhost:5000/api/device/latest/${inverter.deviceSn}`
        )
          .then(res => res.json())
          .then(setDevice);

      });

  }, []);

  if (!device) return <div>Loading...</div>;

  const dataList =
    device.deviceDataList[0].dataList;

  const today =
    dataList.find(
      d => d.key === "DailyActiveProduction"
    )?.value;

  const total =
    dataList.find(
      d => d.key === "TotalActiveProduction"
    )?.value;

  return (

    <div>

      <h2>Device Dashboard</h2>

      <p>Today: {today}</p>

      <p>Total: {total}</p>

    </div>

  );

}
