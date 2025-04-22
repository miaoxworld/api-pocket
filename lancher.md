做一个WEB项目，名称叫做 API Manager

项目功能：
1. 管理API接口，主要是OpenAI兼容API的接口添加、删除、修改、开启关闭
2. 用户支持注册、登录、退出
3. 用户管理的APIKEY支持单次添加、删除，批量添加、删除
4. 最后提供统一的API接口调用入口，支持OpenAI兼容API的接口调用，直接透传返回即可：/v1/chat/completions


项目技术：
1. 全栈Nextjs，数据库mongodb