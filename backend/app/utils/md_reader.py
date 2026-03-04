def md_reader(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    return content