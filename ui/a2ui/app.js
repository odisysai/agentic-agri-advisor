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
    if (comp.type === 'greeting') {
      const div = document.createElement('div');
      div.className = 'a2ui-greeting';
      div.style.marginBottom = '1.25rem';
      div.innerHTML = `<h2 style="margin:0;font-size:1.6rem;color:var(--accent);">${comp.title}</h2>
                       <p style="margin:4px 0 0 0;font-size:0.95rem;color:var(--text-sub);">${comp.subtitle}</p>`;
      container.appendChild(div);
    } else if (comp.type === 'header') {
      const div = document.createElement('div');
      div.className = 'a2ui-header-comp';
      div.style.marginBottom = '1.25rem';
      div.innerHTML = `<h2 style="margin:0;font-size:1.4rem;color:var(--text-main);">${comp.title}</h2>
                       <p style="margin:2px 0 0 0;font-size:0.85rem;color:var(--text-sub);">${comp.subtitle}</p>`;
      container.appendChild(div);
    } else if (comp.type === 'alert_card') {
      const div = document.createElement('div');
      div.className = `a2ui-card alert-${comp.severity || 'info'}`;
      div.style.padding = '1rem';
      div.style.marginBottom = '1rem';
      div.style.borderRadius = '12px';
      div.style.borderLeft = `5px solid ${comp.severity === 'warning' ? 'var(--warning)' : comp.severity === 'critical' ? 'var(--danger)' : 'var(--info)'}`;
      div.style.backgroundColor = 'var(--panel-bg)';
      div.innerHTML = `
        <div style="font-weight:bold;color:var(--text-main);margin-bottom:0.25rem;">⚠️ ${comp.title}</div>
        <div style="font-size:0.9rem;color:var(--text-sub);">${comp.description}</div>
      `;
      container.appendChild(div);
    } else if (comp.type === 'action_card') {
      const div = document.createElement('div');
      div.className = 'a2ui-card';
      div.style.padding = '1.25rem';
      div.style.marginBottom = '1rem';
      div.style.borderRadius = '12px';
      div.style.backgroundColor = 'var(--panel-bg)';
      div.style.border = '1.5px solid var(--accent)';

      const textNode = document.createElement('div');
      textNode.style.fontWeight = '600';
      textNode.style.fontSize = '1.05rem';
      textNode.style.color = 'var(--text-main)';
      textNode.style.marginBottom = '0.5rem';
      textNode.textContent = comp.title;
      div.appendChild(textNode);

      if (comp.description) {
        const descNode = document.createElement('div');
        descNode.style.fontSize = '0.85rem';
        descNode.style.color = 'var(--text-sub)';
        descNode.style.marginBottom = '0.75rem';
        descNode.textContent = comp.description;
        div.appendChild(descNode);
      }

      if (comp.action) {
        const btn = document.createElement('button');
        btn.className = 'a2ui-btn';
        btn.style.width = '100%';
        btn.style.padding = '0.75rem';
        btn.style.borderRadius = '24px';
        btn.style.backgroundColor = 'var(--accent)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.textContent = comp.action.label;
        btn.addEventListener('click', () => {
          const event = new CustomEvent('a2ui-action', {
            detail: { action: comp.action.commandId, button: btn }
          });
          document.dispatchEvent(event);
        });
        div.appendChild(btn);
      }
      container.appendChild(div);
    } else if (comp.type === 'metric_card') {
      const div = document.createElement('div');
      div.className = 'a2ui-card';
      div.style.padding = '1rem';
      div.style.marginBottom = '1rem';
      div.style.borderRadius = '12px';
      div.style.backgroundColor = 'var(--panel-bg)';
      div.style.border = '1px solid var(--border)';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
          <span style="font-size:1.2rem;">${comp.icon || ''}</span>
          <strong style="font-size:0.95rem;color:var(--text-sub);">${comp.title}</strong>
        </div>
        <div style="font-size:1.6rem;font-weight:bold;color:var(--text-main);margin-bottom:0.25rem;">${comp.value}</div>
        <div style="font-size:0.85rem;color:var(--text-sub);">${comp.description || ''}</div>
      `;
      container.appendChild(div);
    } else if (comp.type === 'option_grid') {
      const wrapper = document.createElement('div');
      wrapper.style.marginBottom = '1.25rem';

      if (comp.title) {
        const title = document.createElement('h3');
        title.style.fontSize = '1.05rem';
        title.style.marginBottom = '0.75rem';
        title.style.color = 'var(--text-main)';
        title.textContent = comp.title;
        wrapper.appendChild(title);
      }

      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      grid.style.gap = '0.75rem';

      comp.items.forEach(item => {
        const box = document.createElement('div');
        box.className = 'a2ui-card';
        box.style.padding = '0.75rem';
        box.style.borderRadius = '12px';
        box.style.backgroundColor = 'var(--panel-bg)';
        box.style.border = '1px solid var(--border)';
        box.style.cursor = 'pointer';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.gap = '0.25rem';
        box.style.transition = 'all 0.2s ease';

        box.addEventListener('click', () => {
          const event = new CustomEvent('a2ui-action', {
            detail: { action: item.commandId, button: box }
          });
          document.dispatchEvent(event);
        });

        box.innerHTML = `
          <div style="font-size:1.3rem;">${item.icon || ''}</div>
          <strong style="font-size:0.9rem;color:var(--text-main);">${item.label}</strong>
          <span style="font-size:0.75rem;color:var(--text-sub);">${item.description || ''}</span>
        `;
        grid.appendChild(box);
      });
      wrapper.appendChild(grid);
      container.appendChild(wrapper);
    } else if (comp.type === 'text') {
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
    } else if (comp.type === 'buttons') {
      // Render multiple buttons from comp.items array
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '0.75rem';
      btnContainer.style.flexWrap = 'wrap';
      btnContainer.style.marginTop = '1rem';

      if (comp.items && Array.isArray(comp.items)) {
        comp.items.forEach(item => {
          const btn = document.createElement('button');
          btn.className = `a2ui-btn ${item.variant || 'primary'}`;
          btn.textContent = item.label;
          btn.style.width = item.variant === 'ghost' ? 'auto' : '100%';
          btn.style.flex = item.variant === 'ghost' ? '0 0 auto' : '1 1 0';
          btn.style.marginTop = '0';
          btn.addEventListener('click', () => {
            const event = new CustomEvent('a2ui-action', {
              detail: { action: item.commandId, button: btn }
            });
            document.dispatchEvent(event);
          });
          btnContainer.appendChild(btn);
        });
      }
      container.appendChild(btnContainer);
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
          select.style.borderRadius = 'var(--radius-s)';
          select.style.fontSize = '0.95rem';
          select.style.fontFamily = 'inherit';
          select.style.minHeight = '44px';

          field.options.forEach(opt => {
            const o = document.createElement('option');
            const optionValue = typeof opt === 'object' ? opt.value : opt;
            const optionLabel = typeof opt === 'object' ? (opt.label || opt.value) : opt;
            o.value = optionValue;
            o.textContent = optionLabel;
            select.appendChild(o);
          });
          if (field.value !== undefined) {
            select.value = field.value;
          }
          fRow.appendChild(select);
        } else if (field.type === 'input' || field.type === 'text' || field.type === 'number') {
          const input = document.createElement('input');
          input.name = field.name;
          input.type = field.type === 'number' ? 'number' : 'text';
          input.placeholder = field.placeholder || '';
          input.style.padding = '0.5rem';
          input.style.backgroundColor = 'var(--bg-dark)';
          input.style.color = 'var(--text-main)';
          input.style.border = '1px solid var(--border)';
          input.style.borderRadius = 'var(--radius-s)';
          input.style.fontSize = '0.95rem';
          input.style.fontFamily = 'inherit';
          input.style.minHeight = '44px';
          if (field.value !== undefined && field.value !== '') {
            input.value = field.value;
          }
          if (field.type === 'number' && field.min !== undefined) input.min = field.min;
          if (field.type === 'number' && field.step !== undefined) input.step = field.step;
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
