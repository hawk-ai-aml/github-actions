#!/usr/bin/env python3
"""
Script to copy an environment directory and rename all 'env' subdirectories
to a new environment name.
"""

import os
import shutil
import json
from pathlib import Path
from envsubst import envsubst

def copy_and_rename_environment(source_dir: str, new_env_type: str | None, new_env_region: str | None) -> None:
    """
    Copy a source directory to a destination and rename all 'env' subdirectories
    to the new environment name.
    
    Args:
        source_dir: Path to the source directory to template and copy
        new_env_type: New environment type for all 'env' subdirectories
        new_env_region: New environment region for all 'env' subdirectories
        
    Raises:
        ValueError: If new_env_type or new_env_region is not provided
        FileNotFoundError: If source directory doesn't exist
        FileExistsError: If destination directory already exists
    """
    path = Path(source_dir).resolve()

    # Validate source directory exists
    if not path.exists():
        raise FileNotFoundError(f"Source directory does not exist: {source_dir}")

    if not new_env_type:
        raise ValueError("New environment type is not provided or is empty.")

    if not new_env_region:
        raise ValueError("New environment region is not provided or is empty.")

    # Create a temporary copy to avoid partial copies in case of errors
    # and to stage the files for templating
    temp_path = Path(f"/tmp/{path.relative_to(path.parent)}").resolve()    
    shutil.copytree(path, temp_path)

    print(f"Find all template files and substitute variables...")
    for root, dirs, files in os.walk(temp_path):
        dir = Path(root)
        for file in files:
            file_path = dir / file

            if "_template" in str(file_path):
                try:
                    print(f"Processing file: {file_path}")
                    file_template = file_path.read_text()
                
                    substituted_string = envsubst(file_template)
                    with open(file_path, 'w', encoding='utf-8') as file:
                        file.write(substituted_string)

                except FileNotFoundError:
                    print(f"Error: The file '{file_path}' was not found.")
                except Exception as e:
                    print(f"An error occurred: {e}")
            else:
                print(f"Removing file that is not in a _template dir: {file_path}")
                os.remove(file_path)

    # Find all '_region' subdirectories and rename them
    region_dirs_found = 0
    region_dirs_renamed = 0
    print(f"\nSearching for '_region' subdirectories to rename to '{new_env_region}'...")
    for root, dirs, files in os.walk(temp_path):
        if dir.name =='_region':
            region_dirs_found += 1
            new_dir = dir.parent / new_env_region
            
            try:
                dir.rename(new_dir)
                print(f"  Renamed: {dir.relative_to(temp_path)} -> {new_dir.relative_to(temp_path)}")
                region_dirs_renamed += 1
                
                # Update dirs list to reflect the rename for os.walk
                
            except Exception as e:
                print(f"  ERROR renaming {dir}: {e}")

    # Find all '_template' subdirectories and rename them
    template_dirs_found = 0
    template_dirs_renamed = 0
    print(f"\nSearching for '_template' subdirectories to rename to '{new_env_type}'...")
    for root, dirs, files in os.walk(temp_path):
        if dir.name =='_template':
            template_dirs_found += 1
            new_dir = dir.parent / new_env_type
            
            try:
                dir.rename(new_dir)
                print(f"  Renamed: {dir.relative_to(temp_path)} -> {new_dir.relative_to(temp_path)}")
                template_dirs_renamed += 1
                
                # Update dirs list to reflect the rename for os.walk
                
            except Exception as e:
                print(f"  ERROR renaming {dir}: {e}")
    
    print(f"\nSummary:")
    print(f"  Found {template_dirs_found} '_template' subdirectories")
    print(f"  Successfully renamed {template_dirs_renamed} subdirectories")

    # Copy the entire directory tree
    print(f"Copying {temp_path} to {path}...")
    shutil.copytree(temp_path, path, dirs_exist_ok=True)
    shutil.rmtree(temp_path)
    print(f"Copy complete.")
    
if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv()

    # if len(sys.argv) != 4:
    #     print("Usage: python copy_environment.py <source_dir> <dest_dir> <new_env_name>")
    #     print("\nExample:")
    #     print("  python copy_environment.py ./platform /path/to/kustomize/platform staging")
    #     sys.exit(1)
    
    source_dir = sys.argv[1]

    try:
        copy_and_rename_environment(source_dir, os.environ.get('environment_type'), os.environ.get('aws_region'))
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
