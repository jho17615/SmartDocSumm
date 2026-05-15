# move_hwp_files.py - HWP 파일을 한 폴더로 모으기

import os
import shutil
import sys
from pathlib import Path

def find_hwp_files(source_dir: str) -> list:
    """
    선택한 폴더 및 하위 폴더에서 모든 HWP 파일 찾기
    """
    hwp_files = []
    
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.lower().endswith('.hwp'):
                full_path = os.path.join(root, file)
                hwp_files.append(full_path)
    
    return hwp_files

def move_hwp_files(hwp_files: list, target_dir: str) -> dict:
    """
    HWP 파일을 대상 폴더로 이동
    """
    result = {
        'success': [],
        'failed': [],
        'skipped': []
    }
    
    # 대상 폴더가 없으면 생성
    os.makedirs(target_dir, exist_ok=True)
    
    for src_path in hwp_files:
        file_name = os.path.basename(src_path)
        dest_path = os.path.join(target_dir, file_name)
        
        # 같은 이름의 파일이 있으면 처리
        if os.path.exists(dest_path):
            base, ext = os.path.splitext(file_name)
            counter = 1
            while os.path.exists(dest_path):
                new_name = f"{base}_{counter}{ext}"
                dest_path = os.path.join(target_dir, new_name)
                counter += 1
        
        try:
            shutil.move(src_path, dest_path)
            result['success'].append({
                'from': src_path,
                'to': dest_path
            })
        except Exception as e:
            result['failed'].append({
                'file': src_path,
                'error': str(e)
            })
    
    return result

def print_result(result: dict):
    """
    결과 출력
    """
    print("\n" + "="*60)
    print("📊 이동 결과")
    print("="*60)
    
    # 성공
    print(f"\n✅ 성공: {len(result['success'])}개")
    for item in result['success']:
        print(f"   📄 {os.path.basename(item['from'])}")
        print(f"      → {item['to']}")
    
    # 실패
    if result['failed']:
        print(f"\n❌ 실패: {len(result['failed'])}개")
        for item in result['failed']:
            print(f"   📄 {os.path.basename(item['file'])}")
            print(f"      오류: {item['error']}")
    
    print("\n" + "="*60)

def main():
    """
    메인 함수
    """
    print("\n" + "="*60)
    print("   📁 HWP 파일 모으기 프로그램")
    print("="*60)
    
    # 1. 검색할 폴더 입력
    print("\n[1] HWP 파일을 검색할 폴더를 선택하세요")
    print("    (하위 폴더도 모두 검색합니다)")
    source_dir = input("\n폴더 경로: ").strip()
    source_dir = source_dir.strip('"').strip("'")
    
    if not source_dir:
        print("❌ 폴더 경로가 입력되지 않았습니다.")
        return
    
    if not os.path.exists(source_dir):
        print(f"❌ 폴더가 존재하지 않습니다: {source_dir}")
        return
    
    # 2. 대상 폴더 입력
    print("\n[2] HWP 파일을 모을 폴더를 선택하세요")
    target_dir = input("\n대상 폴더 경로 (엔터: 현재 폴더에 'hwp_files' 폴더 생성): ").strip()
    target_dir = target_dir.strip('"').strip("'")
    
    if not target_dir:
        target_dir = os.path.join(os.getcwd(), "hwp_files")
        print(f"   → 기본 폴더 사용: {target_dir}")
    
    # 3. HWP 파일 검색
    print(f"\n🔍 HWP 파일 검색 중...")
    print(f"   검색 폴더: {source_dir}")
    
    hwp_files = find_hwp_files(source_dir)
    
    if not hwp_files:
        print("\n❌ HWP 파일을 찾을 수 없습니다.")
        return
    
    print(f"\n📄 발견된 HWP 파일: {len(hwp_files)}개")
    
    # 파일 목록 표시
    print("\n[파일 목록]")
    for i, file in enumerate(hwp_files, 1):
        print(f"   {i}. {os.path.basename(file)}")
        print(f"      위치: {os.path.dirname(file)}")
    
    # 4. 확인
    print(f"\n📁 대상 폴더: {target_dir}")
    confirm = input("\n✨ 이동을 시작할까요? (y/n): ").strip().lower()
    
    if confirm != 'y':
        print("❌ 취소되었습니다.")
        return
    
    # 5. 파일 이동
    print(f"\n🚚 파일 이동 중...")
    result = move_hwp_files(hwp_files, target_dir)
    
    # 6. 결과 출력
    print_result(result)

def quick_move():
    """
    빠른 이동 (현재 폴더의 HWP 파일만)
    """
    current_dir = os.getcwd()
    target_dir = os.path.join(current_dir, "hwp_files")
    
    hwp_files = [f for f in os.listdir(current_dir) if f.lower().endswith('.hwp')]
    hwp_files = [os.path.join(current_dir, f) for f in hwp_files]
    
    if not hwp_files:
        print("현재 폴더에 HWP 파일이 없습니다.")
        return
    
    print(f"\n📄 발견된 HWP 파일: {len(hwp_files)}개")
    for f in hwp_files:
        print(f"   - {os.path.basename(f)}")
    
    result = move_hwp_files(hwp_files, target_dir)
    print_result(result)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # 커맨드라인 인자로 폴더 받기
        source = sys.argv[1]
        target = sys.argv[2] if len(sys.argv) > 2 else None
        
        if not os.path.exists(source):
            print(f"❌ 폴더가 없습니다: {source}")
        else:
            hwp_files = find_hwp_files(source)
            if hwp_files:
                if not target:
                    target = os.path.join(source, "hwp_files")
                result = move_hwp_files(hwp_files, target)
                print_result(result)
            else:
                print("HWP 파일이 없습니다.")
    else:
        # 대화형 모드 실행
        main()