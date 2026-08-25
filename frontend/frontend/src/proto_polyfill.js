import * as googleProtobuf from 'google-protobuf'
import * as grpcWeb from 'grpc-web'
import * as weatherpocketPb from './generated/proto/weatherpocket_pb.cjs'

if (typeof window !== 'undefined') {
  if (!window.global) {
    window.global = window
  }

  const moduleMap = {
    'google-protobuf': googleProtobuf.default || googleProtobuf,
    'grpc-web': grpcWeb.default || grpcWeb,
    './weatherpocket_pb.js': weatherpocketPb.default || weatherpocketPb,
    './weatherpocket_pb.cjs': weatherpocketPb.default || weatherpocketPb,
    './weatherpocket_pb': weatherpocketPb.default || weatherpocketPb,
  }

  window.require = function (moduleName) {
    if (moduleMap[moduleName]) {
      return moduleMap[moduleName]
    }
    if (typeof globalThis[moduleName] !== 'undefined') {
      return globalThis[moduleName]
    }
    return {}
  }
}
