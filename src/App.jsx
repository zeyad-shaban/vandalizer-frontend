import { Header } from "./components/Header"
import { ImageForm } from "./components/ImageForm"
import { ImageDisplay } from "./components/ImageDisplay";
import { ErrorMessage } from "./components/ErrorMessage";
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
        <Route path="*" element={
          <main className="px-4 py-10">
            <div className="mx-auto max-w-2xl">
              <ErrorMessage
                err={{
                  title: "Page not found",
                  message: "That workspace page does not exist.",
                }}
              />
            </div>
          </main>
        } />
      </Routes>
    </>
  )
}

export default App
