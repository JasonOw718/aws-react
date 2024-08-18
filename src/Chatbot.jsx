import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

function Chatbot() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [images, setImages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [userImage, setUserImage] = useState(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const connectWebSocket = () => {
      var webSocketString = '';
      if (window.location.hostname === "localhost") {
        webSocketString = "ws://localhost:8000/chatbot/chat";
      } else {
        webSocketString = `wss://${window.location.hostname}/chatbot/chat`;
      }
      const ws = new WebSocket(webSocketString);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setSocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.images) {
            setImages((prevImages) => [...prevImages, ...data.images]);
          } else if (data.text) {
            setAnswer((prevAnswer) => prevAnswer + data.text);
          }
        } catch (error) {
          setAnswer((prevAnswer) => prevAnswer + event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Attempting to reconnect (${retryCount}/${maxRetries})...`
          );
          setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (socket && socket.readyState === WebSocket.OPEN) {
      if (userImage) {
        const reader = new FileReader();

        reader.onload = () => {
          const imageBase64 = reader.result.split(",")[1];
          socket.send(
            JSON.stringify({ message: question, image: imageBase64 })
          );
          setAnswer("");
          setImages([]);
        };

        reader.readAsDataURL(userImage);
      } else {
        socket.send(JSON.stringify({ message: question }));
        setAnswer("");
        setImages([]);
      }
    } else {
      console.error("WebSocket is not connected");
    }
  };


  const handleInputChange = (e) => {
    setQuestion(e.target.value);
  };

  const handleImage = (e) => {
    setUserImage(e.target.files[0]);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask me something..."
          value={question}
          onChange={handleInputChange}
        />
        <input type="file" name="file" onChange={handleImage} />
        <button type="submit">Submit</button>
      </form>
      <div>
        <ReactMarkdown>{answer}</ReactMarkdown>
        {images.length > 0 && (
          <div>
            <h3>Related Images:</h3>
            {images.map((image, index) => (
              <img
                key={index}
                src={`data:image/jpeg;base64,${image}`}
                alt={`Related image ${index + 1}`}
                style={{ maxWidth: "200px", margin: "5px" }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Chatbot;
