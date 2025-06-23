// src-tauri/src/plugin/prevent_zoom.rs

use tauri::Runtime;

pub fn prevent_zoom_plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("prevent-zoom")
        .on_page_load(|window, _| {
            // 每次页面加载完成后注入防止缩放的脚本
            let _ = window.eval(r#"
                // 添加 viewport meta 标签
                const meta = document.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                document.head.appendChild(meta);

                // 添加全局 CSS 防止缩放
                const style = document.createElement('style');
                style.textContent = `
                  html, body {
                    touch-action: manipulation;
                    zoom: reset;
                    overflow: hidden;
                    margin: 0;
                    padding: 0;
                  }
                `;
                document.head.appendChild(style);

                // 阻止 wheel 缩放
                window.addEventListener('wheel', function(e) {
                  if (e.ctrlKey || e.metaKey || e.altKey) {
                    e.preventDefault();
                  }
                }, { passive: false });

                // 阻止手势缩放（如支持）
                window.addEventListener('gesturestart', e => e.preventDefault());
                window.addEventListener('gesturechange', e => e.preventDefault());
                window.addEventListener('gestureend', e => e.preventDefault());
            "#);
        })
        .build()
}
