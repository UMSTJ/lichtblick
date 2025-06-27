// src-tauri/src/file_ops.rs
// 或者直接放在 src-tauri/src/main.rs 中

use std::fs;
use std::io::Write;
use std::path::Path;

#[derive(serde::Serialize, Debug)] // 添加 Debug trait
#[serde(rename_all = "camelCase")] // 可选：使字段名在JS中为驼峰式
pub struct FileStat {
    is_file: bool,
    is_dir: bool,
    size: u64,
    // 如果需要，可以添加其他字段，如修改时间、创建时间等
    // modified_at: Option<u64>, // 例如：SystemTime
    // created_at: Option<u64>,
}

#[tauri::command]
pub fn save_file(directory: String, filename: String, data: Vec<u8>) -> Result<(), String> {
    let dir_path = Path::new(&directory);
    if !dir_path.exists() {
        fs::create_dir_all(dir_path).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    let file_path = dir_path.join(filename);
    let mut file = fs::File::create(&file_path).map_err(|e| format!("创建文件失败 '{:?}': {}", file_path, e))?;
    file.write_all(&data).map_err(|e| format!("写入文件失败 '{:?}': {}", file_path, e))?;
    Ok(())
}

#[tauri::command]
pub fn read_file(directory: String, filename: String) -> Result<Vec<u8>, String> {
    let file_path = Path::new(&directory).join(filename);
    fs::read(&file_path).map_err(|e| format!("读取文件失败 '{:?}': {}", file_path, e))
}

#[tauri::command]
pub fn list_files(directory: String) -> Result<Vec<String>, String> {
    let path = Path::new(&directory);
    if !path.is_dir() {
        return Err(format!("路径不是一个目录: {}", directory));
    }
    fs::read_dir(path)
        .map_err(|e| format!("读取目录失败: {}", e))?
        .map(|entry_result| {
            entry_result
                .map_err(|e| format!("读取目录条目错误: {}", e))
                .map(|entry| entry.file_name().to_string_lossy().into_owned())
        })
        .collect()
}

#[tauri::command]
pub fn delete_file_item(directory: String, filename: String) -> Result<(), String> {
    let file_path = Path::new(&directory).join(filename);
    if !file_path.exists() {
        return Err(format!("文件或目录未找到: {:?}", file_path));
    }

    if file_path.is_dir() {
        fs::remove_dir_all(&file_path).map_err(|e| format!("删除目录失败 '{:?}': {}", file_path, e))
    } else {
        fs::remove_file(&file_path).map_err(|e| format!("删除文件失败 '{:?}': {}", file_path, e))
    }
}

#[tauri::command]
pub fn file_item_exists(directory: String, filename: String) -> Result<bool, String> {
    let file_path = Path::new(&directory).join(filename);
    Ok(file_path.exists())
}

#[tauri::command]
pub fn get_file_item_stats(directory: String, filename: String) -> Result<FileStat, String> {
    let file_path = Path::new(&directory).join(filename);
    let metadata = fs::metadata(&file_path).map_err(|e| format!("获取文件/目录状态失败 '{:?}': {}", file_path, e))?;
    Ok(FileStat {
        is_file: metadata.is_file(),
        is_dir: metadata.is_dir(),
        size: metadata.len(),
    })
}
