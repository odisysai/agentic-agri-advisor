document.addEventListener('DOMContentLoaded', () => {
  const jsonInput = document.getElementById('json-input');
  const renderBtn = document.getElementById('render-btn');
  const canvas = document.getElementById('render-canvas');

  window.renderA2UIPayload = function(payload, targetCanvas) {
    const destCanvas = targetCanvas || canvas;
    destCanvas.innerHTML = '';
    
    if (payload.type === 'card') {
      const card = document.createElement('div');
      card.className = `a2ui-card ${payload.theme || 'default'}`;
      
      const title = document.createElement('h3');
      title.className = 'a2ui-card-title';
      title.textContent = payload.title || 'Notification';
      card.appendChild(title);

      if (payload.components && Array.isArray(payload.components)) {
        payload.components.forEach(comp => {
          renderComponent(comp, card);
        });
      }
      destCanvas.appendChild(card);
    } else {
      destCanvas.innerHTML = `<div class="error-text">Unsupported payload type: ${payload.type}</div>`;
    }
  }

  function renderComponent(comp, container) {
    if (comp.type === 'text') {
      const p = document.createElement('p');
      p.className = 'a2ui-text';
      p.textContent = comp.value;
      container.appendChild(p);
    } else if (comp.type === 'metric') {
      const div = document.createElement('div');
      div.className = `a2ui-metric ${comp.status || 'normal'}`;
      div.innerHTML = `<span class="metric-label">${comp.label}:</span> <strong class="metric-val">${comp.value}</strong>`;
      container.appendChild(div);
    } else if (comp.type === 'button') {
      const btn = document.createElement('button');
      btn.className = 'a2ui-btn';
      btn.textContent = comp.label;
      btn.style.marginBottom = '0.5rem';
      btn.addEventListener('click', () => {
        const event = new CustomEvent('a2ui-action', {
          detail: { action: comp.action, button: btn }
        });
        document.dispatchEvent(event);
      });
      container.appendChild(btn);
    } else if (comp.type === 'grid') {
      const grid = document.createElement('div');
      grid.className = 'a2ui-grid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = `repeat(${comp.columns || 2}, 1fr)`;
      grid.style.gap = '1rem';
      grid.style.marginBottom = '1.25rem';
      
      comp.items.forEach(item => {
        const itemContainer = document.createElement('div');
        renderComponent(item, itemContainer);
        grid.appendChild(itemContainer);
      });
      container.appendChild(grid);
    } else if (comp.type === 'chart') {
      const chartBox = document.createElement('div');
      chartBox.className = 'a2ui-chart';
      chartBox.style.marginBottom = '1.25rem';
      chartBox.innerHTML = `<div class="chart-label" style="font-size:0.9rem;color:var(--text-sub);">${comp.label}</div>`;
      
      const barsContainer = document.createElement('div');
      barsContainer.className = 'chart-bars';
      barsContainer.style.display = 'flex';
      barsContainer.style.gap = '1.5rem';
      barsContainer.style.marginTop = '0.75rem';
      
      for (const [key, val] of Object.entries(comp.data)) {
        const barCol = document.createElement('div');
        barCol.style.display = 'flex';
        barCol.style.flexDirection = 'column';
        barCol.style.alignItems = 'center';
        barCol.style.flexGrow = '1';
        
        const barVal = Number(val);
        const barHeight = Math.min(100, Math.max(20, barVal / 2));
        
        barCol.innerHTML = `
          <span style="font-size:0.8rem;color:var(--text-sub);">${val}</span>
          <div style="width:100%;height:${barHeight}px;background-color:var(--accent);border-radius:4px 4px 0 0;margin:0.25rem 0;"></div>
          <strong style="font-size:0.85rem;">${key}</strong>
        `;
        barsContainer.appendChild(barCol);
      }
      chartBox.appendChild(barsContainer);
      container.appendChild(chartBox);
    } else if (comp.type === 'form') {
      const form = document.createElement('form');
      form.className = 'a2ui-form';
      form.style.marginBottom = '1.25rem';
      form.addEventListener('submit', (e) => e.preventDefault());
      
      comp.fields.forEach(field => {
        const fRow = document.createElement('div');
        fRow.className = 'form-row';
        fRow.style.display = 'flex';
        fRow.style.flexDirection = 'column';
        fRow.style.marginBottom = '1rem';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        label.style.fontSize = '0.9rem';
        label.style.marginBottom = '0.25rem';
        fRow.appendChild(label);
        
        if (field.type === 'select') {
          const select = document.createElement('select');
          select.name = field.name;
          select.style.padding = '0.5rem';
          select.style.backgroundColor = 'var(--bg-dark)';
          select.style.color = 'var(--text-main)';
          select.style.border = '1px solid var(--border)';
          select.style.borderRadius = '4px';
          
          field.options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.toLowerCase();
            o.textContent = opt;
            select.appendChild(o);
          });
          if (field.value !== undefined) {
            select.value = field.value.toLowerCase();
          }
          fRow.appendChild(select);
        } else if (field.type === 'input') {
          const input = document.createElement('input');
          input.name = field.name;
          input.type = 'text';
          input.placeholder = field.placeholder || '';
          input.style.padding = '0.5rem';
          input.style.backgroundColor = 'var(--bg-dark)';
          input.style.color = 'var(--text-main)';
          input.style.border = '1px solid var(--border)';
          input.style.borderRadius = '4px';
          if (field.value !== undefined) {
            input.value = field.value;
          }
          fRow.appendChild(input);
        }
        form.appendChild(fRow);
      });
      container.appendChild(form);
    } else if (comp.type === 'list') {
      const list = document.createElement('div');
      list.className = 'a2ui-list';
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '0.75rem';
      list.style.marginBottom = '1.25rem';
      
      comp.items.forEach(item => {
        const itemBox = document.createElement('div');
        itemBox.className = `list-item ${item.status || 'default'}`;
        itemBox.style.padding = '0.75rem';
        itemBox.style.borderRadius = '6px';
        itemBox.style.backgroundColor = 'var(--bg-dark)';
        
        let borderLeftColor = 'var(--border)';
        if (item.status === 'critical') borderLeftColor = 'var(--danger)';
        if (item.status === 'warning') borderLeftColor = 'var(--warning)';
        
        itemBox.style.borderLeft = `4px solid ${borderLeftColor}`;
        itemBox.innerHTML = `
          <strong style="display:block;margin-bottom:0.25rem;font-size:0.95rem;">${item.title}</strong>
          <span style="font-size:0.85rem;color:var(--text-sub);">${item.desc}</span>
        `;
        list.appendChild(itemBox);
      });
      container.appendChild(list);
    }
  }

  if (renderBtn) {
    renderBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(jsonInput.value);
        window.renderA2UIPayload(parsed);
      } catch (e) {
        canvas.innerHTML = `<div class="error-text">Invalid JSON: ${e.message}</div>`;
      }
    });
  }
});
