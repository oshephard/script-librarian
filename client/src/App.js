import { useState } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/search", { inputValue });
      setResults(response.data.value[0]);
    } catch (error) {
      console.error("Error al buscar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepoUrlChange = (event) => {
    setRepoUrl(event.target.value);
  };

  const handleIndex = async () => {
    try {
      setIsLoading(true);
      await axios.post("/api/index", { repoUrl });
    } catch (error) {
      console.error("Error al indexar:", error);
    } finally {
      setIsLoading(false);
      closeModal();
      setRepoUrl("");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="config-button">
          <button onClick={openModal}>Repository URL</button>
        </div>
        <h1>Script Librarian</h1>
        <div className="search-bar">
          <h2>Search Archives: </h2>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown} // Añadido el manejador de eventos
            placeholder="Enter your question here"
          />
          <button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Loading..." : "Search"}
          </button>
        </div>
        {results?.length > 0 && (
          <div className="response">
            <h2>Response:</h2>
            <ReactMarkdown>{results}</ReactMarkdown>
          </div>
        )}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Configuration of the repository</h2>
              <div className="config-section">
                <p>
                  Enter a Git repository URL to index its files and extract code
                  snippets.
                </p>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={handleRepoUrlChange}
                  placeholder="Enter Git repository URL"
                />
              </div>
              <p></p>
              <div className="search-section">
                <button onClick={handleIndex}>
                  {isLoading ? "Loading..." : "Save"}
                </button>
                <button
                  className="button-close"
                  onClick={closeModal}
                  disabled={isLoading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
