import { Header } from "./components/Header"
import { ImageForm } from "./components/ImageForm"
import { ImageDisplay } from "./components/ImageDisplay";
import { Routes, Route, useNavigate } from "react-router-dom"


function App() {
  const navigate = useNavigate();

  const onImgUpload = (jobID) => {
    navigate(`/detect/${jobID}`);
  }

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<ImageForm onSuccess={onImgUpload} />} />
        <Route path="/detect/:jobID" element={<ImageDisplay />} />
        {/* <Route path="/segment/:jobID" element={<todo />} /> */}
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  )
}

export default App