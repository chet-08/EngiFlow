import { useState, useEffect } from 'react';

export const AutoImageSearch = ({ query }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        // 🚨 UPGRADE: Requesting 'thumbnail' alongside 'original' drastically increases the success rate
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=800&origin=*&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`
        );
        const data = await res.json();
        
        if (data.query && data.query.pages) {
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];
          
          // Try to get the original, fallback to a high-res thumbnail if original is restricted
          if (page.original?.source) {
            setImageUrl(page.original.source);
          } else if (page.thumbnail?.source) {
            setImageUrl(page.thumbnail.source);
          }
        }
      } catch (error) {
        console.error("Failed to fetch image for:", query, error);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [query]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="my-10 p-4 border border-[#4169E1]/30 rounded-2xl bg-[#0a0a0a] flex flex-col items-center justify-center min-h-[200px] shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4169E1] mb-4"></div>
        <span className="text-[#4169E1] text-sm font-mono tracking-widest uppercase animate-pulse">Querying Database: {query}...</span>
      </div>
    );
  }

  // 2. 🚨 UPGRADE: Fallback State (If Wikipedia fails, show this instead of vanishing)
  if (!imageUrl) {
    return (
      <div className="my-10 p-8 border border-slate-800 rounded-2xl bg-gradient-to-br from-[#0a0a0a] to-[#111] flex flex-col items-center justify-center text-center shadow-lg">
        <span className="text-4xl mb-3">🧠</span>
        <h4 className="text-slate-300 font-bold tracking-wide mb-1">Concept: {query}</h4>
        <p className="text-slate-500 text-sm font-light">Visual representation highly recommended for this concept.</p>
      </div>
    );
  }

  // 3. Success State
  return (
    <div className="my-12 flex flex-col items-center">
      <img 
        src={imageUrl} 
        alt={query} 
        className="max-w-full h-auto max-h-[450px] object-contain rounded-xl border border-slate-700 shadow-[0_0_30px_rgba(65,105,225,0.15)] bg-[#050505] p-2"
      />
      <span className="text-slate-500 text-xs mt-4 font-mono tracking-wider uppercase">
        Visual Reference: {query}
      </span>
    </div>
  );
};