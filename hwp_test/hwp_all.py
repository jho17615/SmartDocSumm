# hwp_preserve_lines.py
import os
import olefile
import re

def extract_hwp_with_linebreaks(filepath):
    """HWP 파일에서 줄바꿈을 유지하며 텍스트 추출"""
    
    if not os.path.exists(filepath):
        return None, "파일 없음"
    
    if not olefile.isOleFile(filepath):
        return None, "OLE 파일 아님"
    
    ole = olefile.OleFileIO(filepath)
    
    try:
        if not ole.exists('BodyText/Section0'):
            return None, "BodyText/Section0 없음"
        
        data = ole.openstream('BodyText/Section0').read()
        content = data.decode('utf-16-le', errors='ignore')
        
        # HWPML에서 텍스트와 줄바꿈 정보 추출
        lines = []
        
        # 1. <hp:lineBreak> 태그를 줄바꿈으로 변환
        content = re.sub(r'<[^>]+:lineBreak[^>]*/>', '\n', content)
        
        # 2. <hp:paragraph> 태그 처리
        content = re.sub(r'<[^>]+:paragraph[^>]*>', '', content)
        
        # 3. </hp:paragraph> 를 줄바꿈으로
        content = re.sub(r'</[^>]+:paragraph>', '\n', content)
        
        # 4. <hp:t> 태그 내의 텍스트 추출
        # 정규식으로 <hp:t>텍스트</hp:t> 찾기
        text_parts = re.findall(r'<[^>]+:t[^>]*>([^<]+)</[^>]+:t>', content)
        
        if text_parts:
            # 텍스트 조각들을 합치기 (줄바꿈 유지)
            result = ''
            for i, part in enumerate(text_parts):
                result += part
                # 문장 끝에 줄바꿈 추가 (선택사항)
                if part.endswith(('.', '!', '?', '。', '！', '？')):
                    result += '\n'
                elif i < len(text_parts) - 1:
                    result += ' '
            
            return result.strip(), None
        
        # 대체 방법: 태그 제거하고 줄바꿈 정보 유지
        # XML 태그 제거 (줄바꿈 태그는 유지)
        content = re.sub(r'<(?!(?:/?(?:hp:lineBreak|hp:paragraph)\b))[^>]+>', '', content)
        # 여러 공백 정리
        content = re.sub(r' +', ' ', content)
        # 빈 줄 정리
        content = re.sub(r'\n\s*\n', '\n', content)
        
        return content.strip(), None
        
    except Exception as e:
        return None, f"오류: {e}"
    finally:
        ole.close()

def extract_with_paragraph_preservation(filepath):
    """문단 구조를 보존하는 텍스트 추출"""
    
    if not olefile.isOleFile(filepath):
        return None
    
    ole = olefile.OleFileIO(filepath)
    
    try:
        data = ole.openstream('BodyText/Section0').read()
        content = data.decode('utf-16-le', errors='ignore')
        
        # 문단 단위로 분리
        # HWPML에서 문단은 <hp:paragraph> 태그로 구분
        
        # 1. 문단 태그를 줄바꿈으로 변환
        # 여는 태그 제거
        content = re.sub(r'<[^>]+:paragraph[^>]*>', '', content)
        # 닫는 태그를 줄바꿈 2개로 (문단 구분)
        content = re.sub(r'</[^>]+:paragraph>', '\n\n', content)
        
        # 2. 줄바꿈 태그 처리
        content = re.sub(r'<[^>]+:lineBreak[^>]*/>', '\n', content)
        
        # 3. 나머지 XML 태그 제거
        content = re.sub(r'<[^>]+>', '', content)
        
        # 4. HTML 엔티티 복원
        html_entities = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&apos;': "'",
            '&nbsp;': ' '
        }
        for entity, char in html_entities.items():
            content = content.replace(entity, char)
        
        # 5. 공백 정리
        content = re.sub(r' +', ' ', content)  # 여러 공백을 하나로
        content = re.sub(r'\n{3,}', '\n\n', content)  # 3개 이상 줄바꿈을 2개로
        content = content.strip()
        
        return content
        
    except Exception as e:
        print(f"오류: {e}")
        return None
    finally:
        ole.close()

def save_with_linebreaks(text, original_path):
    """줄바꿈을 유지하며 저장"""
    
    if not text:
        return False
    
    output_path = original_path.replace('.hwp', '_정리됨.txt')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"\n💾 저장 완료: {output_path}")
    print(f"📊 텍스트 크기: {len(text):,}자")
    
    # 줄 통계
    lines = text.split('\n')
    print(f"📊 줄 수: {len(lines)}줄")
    print(f"📊 평균 줄 길이: {len(text)//len(lines) if lines else 0}자")
    
    # 미리보기 (줄바꿈 유지)
    print(f"\n📖 미리보기 (처음 10줄):")
    print("="*70)
    for i, line in enumerate(lines[:10], 1):
        if line.strip():
            print(f"{i:3d}: {line[:80]}")
    print("="*70)
    
    return True

def process_folder_preserve_lines(folder_path):
    """폴더 내 모든 파일 처리 (줄바꿈 유지)"""
    
    print("="*70)
    print(" HWP → TXT 변환기 (문단 구조 보존)")
    print("="*70)
    
    if not os.path.exists(folder_path):
        print(f"❌ 폴더 없음: {folder_path}")
        return
    
    # HWP 파일 찾기
    hwp_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith('.hwp'):
                hwp_files.append(os.path.join(root, file))
    
    if not hwp_files:
        print(f"❌ HWP 파일 없음")
        return
    
    print(f"\n📁 처리 폴더: {folder_path}")
    print(f"📄 발견: {len(hwp_files)}개 파일\n")
    
    # 출력 폴더
    output_folder = os.path.join(folder_path, "extracted_with_lines")
    os.makedirs(output_folder, exist_ok=True)
    
    success = 0
    fail = 0
    total_lines = 0
    
    for i, hwp_path in enumerate(hwp_files, 1):
        filename = os.path.basename(hwp_path)
        print(f"[{i:3d}/{len(hwp_files)}] {filename[:50]:50}", end=' ')
        
        try:
            text = extract_with_paragraph_preservation(hwp_path)
            
            if text and len(text) > 50:
                output_path = os.path.join(output_folder, filename.replace('.hwp', '.txt'))
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                
                line_count = len(text.split('\n'))
                total_lines += line_count
                
                print(f"✅ {len(text):,}자, {line_count}줄")
                success += 1
            else:
                print(f"❌ 텍스트 부족 ({len(text) if text else 0}자)")
                fail += 1
        except Exception as e:
            print(f"❌ 오류: {e}")
            fail += 1
    
    print("\n" + "="*70)
    print("📊 처리 결과")
    print("="*70)
    print(f"✅ 성공: {success}개")
    print(f"❌ 실패: {fail}개")
    print(f"📝 총 줄 수: {total_lines:,}줄")
    if success > 0:
        print(f"📊 평균 줄 수: {total_lines//success}줄/파일")
    print(f"📁 저장 위치: {output_folder}")
    
    # 예시 파일 보여주기
    if success > 0:
        example_file = os.path.join(output_folder, os.listdir(output_folder)[0])
        print(f"\n📖 예시 파일: {os.path.basename(example_file)}")
        with open(example_file, 'r', encoding='utf-8') as f:
            preview = f.read(500)
        print("\n내용 미리보기:")
        print("="*70)
        print(preview)
        print("...")

def main():
    # 테스트 파일
    test_file = r"C:\Users\2class_17\Desktop\hwp\1918490_의사국 의안과_의안원문.hwp"
    
    print("\n1. 단일 파일 테스트 (줄바꿈 유지)")
    print("2. 전체 폴더 일괄 처리")
    
    choice = input("\n선택 (1 또는 2): ")
    
    if choice == '1':
        print(f"\n📄 처리: {os.path.basename(test_file)}")
        text = extract_with_paragraph_preservation(test_file)
        
        if text:
            save_with_linebreaks(text, test_file)
            
            # 추가 분석
            lines = text.split('\n')
            print(f"\n📊 상세 분석:")
            print(f"   총 문자: {len(text):,}자")
            print(f"   총 줄: {len(lines)}줄")
            print(f"   빈 줄: {lines.count('')}줄")
            print(f"   내용 줄: {len([l for l in lines if l.strip()])}줄")
        else:
            print("❌ 추출 실패")
    
    else:
        folder = r"C:\Users\2class_17\Desktop\hwp"
        process_folder_preserve_lines(folder)

if __name__ == "__main__":
    main()

