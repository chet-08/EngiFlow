import React, { useState } from 'react';

const UploadScreen = ({ token, setSyllabusData }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!file) return alert("Please select a file first!");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/syllabus/upload-syllabus", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setSyllabusData(data); 

    } catch (error) {
      console.error("Upload Error:", error);
      alert("Failed to upload. Please check the console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Pure Black Background & Lexend Font Applied
    <div className="w-full h-full flex items-center justify-center bg-black" style={{ fontFamily: "'Lexend', sans-serif" }}>
      
      {/* The Upload Card */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 rounded-2xl shadow-[0_0_50px_rgba(65,105,225,0.05)] flex flex-col items-center max-w-md w-full mx-4">
        
        <h2 className="text-3xl font-bold text-white mb-2">Upload Syllabus</h2>
        <p className="text-slate-400 text-sm mb-8 text-center">Select your course PDF to generate your interactive skill tree.</p>
        
        {/* Sleek Custom File Input */}
        <div className="w-full mb-8">
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-[#4169E1] hover:bg-[#4169E1]/5 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mb-2 text-sm text-slate-400">
                <span className="font-semibold text-[#4169E1]">Click to browse</span> or drag and drop
              </p>
              {/* Show the selected file name in white if chosen, otherwise show instructions */}
              <p className="text-xs font-medium mt-1 text-white">
                {file ? `📄 ${file.name}` : "PDF files only"}
              </p>
            </div>
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
          </label>
        </div>

        {/* Royal Blue Button */}
        <button 
          onClick={handleFileUpload}
          disabled={isLoading || !file}
          className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg ${
            isLoading || !file 
            ? 'bg-[#1a1a1a] text-slate-500 cursor-not-allowed' 
            : 'bg-[#4169E1] text-white hover:bg-blue-600 hover:scale-[1.02]'
          }`}
        >
          {isLoading ? "Analyzing PDF..." : "Generate Skill Tree"}
        </button>
      </div>
    </div>
  );
};

export default UploadScreen;