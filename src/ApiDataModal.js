import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ApiDataModal = ({ isOpen = false, onClose }) => { // Default value for isOpen
    const [data, setData] = useState([]);
    const [lastRefresh, setLastRefresh] = useState(null);
    const apiUrl = "https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList";
    const backendUrl = "https://rabbitmq-backend-xbwi-git-main-akashsaini-12s-projects.vercel.app/api/store-api-data"; // Your backend API endpoint

    const fetchData = async () => {
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    pageSize: 10,
                    pageNo: 1,
                    typeId: 30,
                    language: 0,
                    random: "da2b91a313df441f8bf9cfa7bff1bd36",
                    signature: "07CCE4D7FBF1C05C53036CA58EEFBCD3",
                    timestamp: 1743146850,
                }),
            });

            const result = await response.json();
            if (result.data && result.data.list) {
                console.log(result.data.list[0], 'kk')
                setData(result.data.list); // Replace data instead of appending
                setLastRefresh(new Date().toLocaleTimeString());

                // Store data in MongoDB through our backend
                console.log(result.data.list[0])
                try {
                    const storeResponse = await fetch(backendUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(result.data.list[0])
                    });
                    console.log(storeResponse, 'storeResponse')
                    if (!storeResponse.ok) {
                        console.error('Failed to store data in MongoDB');
                    }
                } catch (error) {
                    console.error('Error storing data in MongoDB:', error);
                }
            }
        } catch (error) {
            console.error("API Fetch Error:", error);
        }
    };

    useEffect(() => {
        fetchData(); // Initial API Call
        const interval = setInterval(fetchData, 27000); // Call API every 30 sec

        return () => clearInterval(interval);
    }, []);

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "API Data");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(dataBlob, "API_Data.xlsx");
    };

    if (!isOpen) return null; // Prevent rendering if modal is not open

    return (
        <div style={modalStyles}>
            <div style={modalContentStyles}>
                <h2>API Data Modal</h2>
                <div style={{ marginBottom: '10px', color: '#666' }}>
                    Last refreshed: {lastRefresh || 'Never'}
                </div>
                <button onClick={onClose} style={buttonStyle}>Close</button>
                <button onClick={exportToExcel} style={buttonStyle}>Download Excel</button>
                <button onClick={fetchData} style={buttonStyle}>Refresh Now</button>

                <table border="1" cellPadding="5" style={tableStyle}>
                    <thead>
                        <tr>
                            <th>Issue</th>
                            <th>Number</th>
                            <th>Colour</th>
                            <th>Premium</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={index}>
                                <td>{item.issueNumber}</td>
                                <td>{item.number}</td>
                                <td>{item.colour}</td>
                                <td>{item.premium}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Styles
const modalStyles = {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const modalContentStyles = {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "80%",
    maxHeight: "80%",
    overflowY: "auto",
    textAlign: "center",
};

const buttonStyle = {
    margin: "10px",
    padding: "10px 15px",
    cursor: "pointer",
};

const tableStyle = {
    width: "100%",
    marginTop: "20px",
};

export default ApiDataModal;
