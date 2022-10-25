#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[tauri::command]
fn add_dataset(name: String) -> String {
  let client = reqwest::blocking::Client::new();
  let res = client.post(format!("http://localhost:4200/datasets/{}", name))
    .send();
  match res {
    Ok(response) => {
      //TODO check response
      match response.text() {
        Ok(text) => format!("Added {}", text),
        Err(_) => String::from("Error")
      }
    },
    Err(e) => String::from("Error")
  }
}

#[tauri::command]
fn remove_dataset(name: String) -> String {
  let client = reqwest::blocking::Client::new();
  let res = client.delete(format!("http://localhost:4200/datasets/{}", name))
    .send();
  match res {
    Ok(response) => {
      //TODO check response
      match response.text() {
        Ok(text) => format!("Removed {}", text),
        Err(_) => String::from("Error")
      }
    },
    Err(e) => String::from("Error")
  }
}

#[tauri::command]
fn all_datasets() -> Vec<String> {
  let res = reqwest::blocking::get("http://localhost:4200/datasets");
  match res {
    Ok(response) => {
      match response.text() {
        Ok(text) => {
          println!("{}", text);
          text.split("\n").filter(|x| !x.is_empty()).map(|x| String::from(x)).collect()
        },
        Err(e) => vec![String::from("Error")]
      }
    },
    Err(e) => vec![String::from("Error")]
  }
}

#[tauri::command]
fn run_write(dataset: String, input: String) {
  println!("Running Write on {}:\n{}", dataset, input);
}

#[tauri::command]
fn run_query(dataset: String, input: String) {
  println!("Running Query on {}:\n{}", dataset, input);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            add_dataset,
            remove_dataset,
            all_datasets,
            run_write,
            run_query,      
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
