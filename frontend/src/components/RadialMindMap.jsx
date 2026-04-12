import React, { useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RadialMindMap = ({ syllabusData, onNodeClick }) => {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehavior = useRef(null);
  
  const width = 4000;
  const height = 4000;
  const radius = width / 2;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    zoomBehavior.current = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior.current);

    // Initial positioning
    svg.call(
      zoomBehavior.current.transform, 
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.5)
    );
  }, []);

  const { nodes, links } = useMemo(() => {
    if (!syllabusData || !syllabusData.units || syllabusData.units.length === 0) {
      return { nodes: [], links: [] };
    }

    const d3FormattedData = {
      name: syllabusData.subjectTitle || "Course Roadmap", 
      type: "root",
      children: syllabusData.units.map((unit, index) => {
        const vibrantColors = ["#4169E1", "#22c55e", "#f59e0b", "#ec4899", "#a855f7"]; 
        const branchColor = vibrantColors[index % vibrantColors.length];

        return {
          name: unit.title,
          type: "unit",
          color: branchColor,
          children: unit.topics.map(topic => {
            let children = [];
            if (topic.cachedNote && topic.cachedNote.subtopics) {
              children = topic.cachedNote.subtopics.map(sub => ({
                name: sub.title,
                type: "subtopic",
                parentTopicTitle: topic.title 
              }));
            }
            return {
              name: topic.title,
              type: "topic",
              status: topic.status || 'locked',
              rawTitle: topic.title,
              children: children.length > 0 ? children : undefined
            };
          })
        };
      })
    };

    const root = d3.hierarchy(d3FormattedData);
    
    const treeLayout = d3.tree()
      .size([2 * Math.PI, radius - 400])
      .separation((a, b) => (a.parent === b.parent ? 2 : 3));
    
    treeLayout(root);

    root.each(d => {
      if (d.depth === 0) d.y = 0;          
      if (d.depth === 1) d.y = 400;       
      if (d.depth === 2) d.y = 950; 
      if (d.depth === 3) d.y = 1500; 
    });

    return {
      nodes: root.descendants(),
      links: root.links()
    };
  }, [syllabusData, radius]);

  const linkPathGenerator = d3.linkRadial()
    .angle(d => d.x)
    .radius(d => d.y);

  const handleElementClick = (node) => {
    if (node.data.type === 'topic') {
      if (node.data.status === 'locked') {
        alert("🔒 Unit Locked: Complete the preceding topics to unlock this intelligence module.");
      } else {
        onNodeClick(node.data.rawTitle, null);
      }
    } 
    else if (node.data.type === 'subtopic') {
      onNodeClick(node.data.parentTopicTitle, node.data.name);
    }
  };

  const handleZoomIn = () => d3.select(svgRef.current).transition().call(zoomBehavior.current.scaleBy, 1.4);
  const handleZoomOut = () => d3.select(svgRef.current).transition().call(zoomBehavior.current.scaleBy, 0.6);
  const handleReset = () => {
    d3.select(svgRef.current).transition().duration(750).call(
      zoomBehavior.current.transform, 
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.5)
    );
  };

 
  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      
      {/* HUD Controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-700 text-slate-400 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase z-10 pointer-events-none backdrop-blur-md">
        Map Navigation Active
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-2 bg-black/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Completed</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#facc15]"></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unlocked</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Locked</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 flex flex-col gap-2 bg-[#0a0a0a] border border-slate-800 p-2 rounded-2xl shadow-2xl z-20">
        <button onClick={handleZoomIn} className="w-11 h-11 flex items-center justify-center text-xl text-slate-400 hover:text-[#4169E1] hover:bg-slate-900 rounded-xl transition-all">+</button>
        <button onClick={handleZoomOut} className="w-11 h-11 flex items-center justify-center text-2xl text-slate-400 hover:text-[#4169E1] hover:bg-slate-900 rounded-xl transition-all">-</button>
        <div className="h-px bg-slate-800 mx-2"></div>
        <button onClick={handleReset} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-[#4169E1] hover:bg-slate-900 rounded-xl transition-all">⌂</button>
      </div>

      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" viewBox={`0 0 ${width} ${height}`}>
        <g ref={gRef}>
          {links.map((link, i) => {
            let branchColor = "#1e293b";
            let ancestor = link.target;
            while (ancestor.depth > 1) ancestor = ancestor.parent;
            if (ancestor.data.color) branchColor = ancestor.data.color;

            return (
              <path
                key={`link-${i}`}
                d={linkPathGenerator(link)}
                fill="none"
                stroke={branchColor}
                strokeWidth={link.source.depth === 0 ? 6 : 2}
                strokeOpacity={0.4}
                className="transition-all duration-700"
              />
            );
          })}

          {nodes.map((node, i) => {
            const x = node.y * Math.cos(node.x - Math.PI / 2);
            const y = node.y * Math.sin(node.x - Math.PI / 2);
            const isLeftSide = node.x > Math.PI; 
            const isRoot = node.depth === 0;

            // 🚨 BULLETPROOF FIX: Forces the data to be a string before checking .length
            const safeName = String(node.data.name || "Unnamed Topic");

            const maxChars = 35;
            const displayName = safeName.length > maxChars 
              ? safeName.substring(0, maxChars) + "..." 
              : safeName;

            const textLength = displayName.length;
            const charMultiplier = isRoot ? 9 : 7.5; 
            const calculatedWidth = textLength * charMultiplier + 40; 
            
            let pillColor = "#0f172a"; 
            let textColor = "#94a3b8";
            let strokeColor = "#1e293b";
            let boxWidth = Math.max(180, calculatedWidth); 
            
            if (isRoot) {
              boxWidth = Math.max(300, calculatedWidth); 
              pillColor = "#000";
              strokeColor = "#4169E1";
              textColor = "#fff";
            } else if (node.depth === 1) { 
              pillColor = node.data.color;
              textColor = "#fff";
              strokeColor = "none";
            } else if (node.depth === 2 || node.depth === 3) { 
              pillColor = node.data.status === 'unlocked' ? '#facc15' : (node.data.status === 'completed' ? '#22c55e' : '#0f172a');
              textColor = node.data.status === 'unlocked' ? 'black' : 'white';
              strokeColor = "none";
              
              if (node.depth === 3) {
                pillColor = "#1e293b";
                textColor = "#cbd5e1";
                boxWidth = Math.max(160, calculatedWidth);
              }
            }

            const textOffset = isLeftSide ? -(boxWidth / 2) - 10 : (boxWidth / 2) + 10;
            const isClickable = (node.data.type === 'topic' && node.data.status !== 'locked') || node.data.type === 'subtopic';

            return (
              <g key={`node-${i}`} transform={`translate(${x}, ${y})`}>
                <title>{safeName}</title>
                
                <rect
                  x={isRoot ? -(boxWidth/2) : (isLeftSide ? -boxWidth - 10 : 10)}
                  y={-20}
                  width={boxWidth}
                  height={40}
                  rx={20} 
                  fill={pillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                  className={`transition-all duration-300 ${isClickable ? 'hover:brightness-125 hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}`}
                  onClick={() => handleElementClick(node)}
                />
                
                <text
                  x={isRoot ? 0 : textOffset}
                  y={5}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={isRoot ? "16px" : "13px"}
                  fontWeight={isRoot || node.depth === 1 ? "bold" : "600"}
                  className="pointer-events-none select-none tracking-tight"
                >
                  {displayName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default RadialMindMap;