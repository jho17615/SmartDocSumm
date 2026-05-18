"""HWP BinData 스트림 raw 데이터 확인"""
import olefile
import struct
import zlib

path = input("HWP 파일 경로: ").strip().strip('"')
ole = olefile.OleFileIO(path)

streams = ole.listdir()
for stream_path in streams:
    if stream_path[0] == 'BinData':
        data = ole.openstream(stream_path).read()
        print(f"\n스트림: {'/'.join(stream_path)}")
        print(f"크기: {len(data):,} bytes")
        print(f"앞 32바이트 (hex): {data[:32].hex()}")
        print(f"앞 32바이트 (raw): {data[:32]}")
        
        # JPEG 시작점 찾기
        jpg_idx = data.find(b'\xff\xd8\xff')
        print(f"JPEG 시작점: {jpg_idx}")
        
        if jpg_idx != -1:
            print(f"JPEG 시작 후 16바이트: {data[jpg_idx:jpg_idx+16].hex()}")
        
        # zlib 압축 여부 확인
        try:
            decompressed = zlib.decompress(data, -15)
            print(f"zlib 압축 해제 성공! 해제 후 크기: {len(decompressed):,}")
            print(f"해제 후 앞 32바이트: {decompressed[:32].hex()}")
            jpg_idx2 = decompressed.find(b'\xff\xd8\xff')
            print(f"해제 후 JPEG 시작점: {jpg_idx2}")
        except:
            print("zlib 압축 아님")

ole.close()