export default function BufferLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center
                    bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="text-center">
        <div className="relative w-[75px] h-[100px] mx-auto">
          <div className="loader-bar bar1" />
          <div className="loader-bar bar2" />
          <div className="loader-bar bar3" />
          <div className="loader-bar bar4" />
          <div className="loader-bar bar5" />
          <div className="loader-ball" />
        </div>

        <p className="mt-6 text-sm font-semibold text-gray-900">
          Loading your campus feed…
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Please wait ⏳
        </p>
      </div>
    </div>
  );
}