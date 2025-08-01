from pathlib import Path

def get_file_contents(directory: str):
    """
    Get all the prompt files in the given directory.
    """
    prompts = {}
    path = Path(directory)
    for file in path.glob("*.md"):
        with open(file, 'r') as f:
            prompts[file.stem] = f.read()
    return prompts

def read_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        return content
    except FileNotFoundError:
        print(f"Error: The file at {file_path} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")