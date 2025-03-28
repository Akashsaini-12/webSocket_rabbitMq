import React, { useState } from "react";

const App = () => {
  const [task, setTask] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);
  const [taskList, setTaskList] = useState([]);
  const [values, setValues] = useState(null);

  function generateUnique10DigitNumber() {
    // Generate a number between 1000000000 and 9999999999
    const min = 1000000000;  // 10-digit number starts at 1000000000
    const max = 9999999999;  // 10-digit number ends at 9999999999

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // To generate multiple unique 10-digit numbers

  const submitTask = () => {
    if (task.trim() === "") return; // Prevent empty tasks
    const newTask = { id: generateUnique10DigitNumber(), taskName: task };
    setTaskList([newTask, ...taskList]);
    setTask("");
  };

  const deleteTask = (value) => {
    const updatedTask = taskList.filter((item) => item.id !== value.id);
    setTaskList(updatedTask);
  };

  const updateTask = (value) => {
    if (!value) return;
    setValues(value);
    setTask(value.taskName);
    setShowUpdate(true);
  };

  const updateTasks = () => {
    if (task.trim() === "") return; // Prevent empty updates

    const updatedTasks = taskList.map((item) =>
      item.id === values.id ? { ...item, taskName: task } : item
    );

    setTask("");
    setShowUpdate(false);
    setTaskList(updatedTasks);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter the task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
        />
        <button
          onClick={showUpdate ? updateTasks : submitTask}
          style={{
            padding: 10,
            borderRadius: 5,
            backgroundColor: "blue",
            color: "white",
            cursor: "pointer",
          }}
        >
          {showUpdate ? "Update" : "Send"}
        </button>
      </div>

      {taskList.length === 0 ? (
        <p style={{ color: "gray" }}>No tasks available</p>
      ) : (
        taskList.map((value) => (
          <div key={value.id} style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ padding: 10, border: "1px solid black", minWidth: 150, textAlign: "center" }}>
              {value.taskName}
            </div>
            <button
              onClick={() => deleteTask(value)}
              style={{
                padding: 10,
                borderRadius: 5,
                backgroundColor: "red",
                color: "white",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
            <button
              onClick={() => updateTask(value)}
              style={{
                padding: 10,
                borderRadius: 5,
                backgroundColor: "orange",
                color: "white",
                cursor: "pointer",
              }}
            >
              Update
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default App;
