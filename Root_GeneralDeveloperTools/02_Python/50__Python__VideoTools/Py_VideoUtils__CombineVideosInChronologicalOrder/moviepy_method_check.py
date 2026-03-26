#!/usr/bin/env python
"""
Quick test to check which MoviePy video clipping methods are available
"""

def check_moviepy_methods():
    """Check available MoviePy video clip methods"""
    try:
        # Try MoviePy v2.0+ syntax first
        try:
            from moviepy import VideoFileClip
            print("✅ MoviePy v2.x+ import successful")
        except ImportError:
            # Fallback to v1.x syntax
            from moviepy.editor import VideoFileClip
            print("✅ MoviePy v1.x import successful")
        
        # Create a dummy clip to check available methods
        print("\n🔍 Checking available video clipping methods...")
        
        # Check for common clipping methods
        methods_to_check = [
            'subclip',
            'subclipped', 
            'with_duration',
            'set_duration',
            'cutout',
            'with_start',
            'with_end'
        ]
        
        print(f"VideoFileClip available methods related to clipping:")
        available_methods = []
        for method in methods_to_check:
            if hasattr(VideoFileClip, method):
                available_methods.append(method)
                print(f"  ✅ {method}")
            else:
                print(f"  ❌ {method}")
        
        print(f"\n📋 Available clipping methods: {available_methods}")
        
        # Check all methods containing 'clip' or 'duration'
        all_methods = [method for method in dir(VideoFileClip) if not method.startswith('_')]
        clip_duration_methods = [method for method in all_methods if 'clip' in method.lower() or 'duration' in method.lower()]
        
        if clip_duration_methods:
            print(f"\n🔧 All methods containing 'clip' or 'duration':")
            for method in clip_duration_methods:
                print(f"  • {method}")
        
        return available_methods
        
    except ImportError as e:
        print(f"❌ Failed to import MoviePy: {str(e)}")
        return []

if __name__ == "__main__":
    available = check_moviepy_methods()
    
    if 'subclipped' in available:
        print("\n✅ RECOMMENDATION: Use clip.subclipped(start, end)")
    elif 'with_duration' in available:
        print("\n✅ RECOMMENDATION: Use clip.with_duration(duration)")
    elif 'subclip' in available:
        print("\n✅ RECOMMENDATION: Use clip.subclip(start, end)")
    else:
        print("\n⚠️  WARNING: No standard clipping methods found!") 