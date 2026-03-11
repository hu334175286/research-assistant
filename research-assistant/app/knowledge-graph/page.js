'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function KnowledgeGraphPage() {
  const svgRef = useRef(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterTier, setFilterTier] = useState('all');

  useEffect(() => {
    fetch('/api/papers?includeMeta=1&pageSize=100')
      .then(r => r.json())
      .then(data => {
        const items = data.items || data;
        setPapers(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!papers.length || !svgRef.current) return;

    const width = 900;
    const height = 600;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    // Filter papers
    const filtered = filterTier === 'all' ? papers : papers.filter(p => p.venueTier === filterTier);

    // Build nodes
    const nodes = filtered.map((p, i) => ({
      id: p.id,
      title: p.title,
      tier: p.venueTier || 'unknown',
      year: p.year,
      source: p.source,
      index: i,
    }));

    // Build links (same source or shared keywords)
    const links = [];
    const sourceGroups = {};
    nodes.forEach(n => {
      const s = n.source || 'unknown';
      if (!sourceGroups[s]) sourceGroups[s] = [];
      sourceGroups[s].push(n);
    });
    Object.values(sourceGroups).forEach(group => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          links.push({ source: group[i].id, target: group[j].id, type: 'source' });
        }
      }
    });

    // Color scale
    const colorScale = {
      A: '#22c55e',
      B: '#3b82f6',
      unknown: '#9ca3af',
    };

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Node circles
    node.append('circle')
      .attr('r', d => d.tier === 'A' ? 12 : d.tier === 'B' ? 10 : 8)
      .attr('fill', d => colorScale[d.tier] || colorScale.unknown)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .text(d => d.title.slice(0, 20) + (d.title.length > 20 ? '...' : ''))
      .attr('x', 14)
      .attr('y', 4)
      .attr('font-size', 11)
      .attr('fill', '#374151');

    // Click handler
    node.on('click', (event, d) => {
      setSelectedNode(d);
    });

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [papers, filterTier]);

  return (
    <main style={{ maxWidth: 1200, margin: '20px auto', padding: 24 }}>
      <h2>文献知识图谱</h2>
      <p>可视化展示文献间的关联关系（同来源聚类）。节点大小表示质量等级，颜色区分 tier。</p>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>质量筛选：</label>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="all">全部</option>
          <option value="A">Tier A (顶刊顶会)</option>
          <option value="B">Tier B</option>
          <option value="unknown">未分级</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>
          共 {papers.length} 篇文献
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
          {loading ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>加载中...</p>
          ) : (
            <svg ref={svgRef} style={{ width: '100%', height: 600 }} />
          )}
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff', height: 'fit-content' }}>
          <h4 style={{ marginTop: 0 }}>节点详情</h4>
          {selectedNode ? (
            <div>
              <p><strong>标题：</strong>{selectedNode.title}</p>
              <p><strong>等级：</strong><span style={{ color: selectedNode.tier === 'A' ? '#22c55e' : selectedNode.tier === 'B' ? '#3b82f6' : '#9ca3af' }}>{selectedNode.tier}</span></p>
              <p><strong>年份：</strong>{selectedNode.year || '-'}</p>
              <p><strong>来源：</strong>{selectedNode.source || '-'}</p>
              <a href={`/papers/${selectedNode.id}`} style={{ color: '#2563eb' }}>查看详情 →</a>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>点击图谱节点查看详情</p>
          )}

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

          <h4>图例</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
              <span>Tier A (顶刊顶会)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
              <span>Tier B</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />
              <span>未分级</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
