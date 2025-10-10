# =============================================================================
# Nginx Docker 配置
# =============================================================================

FROM nginx:1.25-alpine

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建SSL目录
RUN mkdir -p /etc/nginx/ssl

# 生成自签名默认SSL证书（用于默认服务器）
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/default.key \
    -out /etc/nginx/ssl/default.crt \
    -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"

# 创建certbot目录
RUN mkdir -p /var/www/certbot

# 设置权限
RUN chown -R nginx:nginx /var/www/certbot && \
    chmod -R 755 /var/www/certbot

# 暴露端口
EXPOSE 80 443

# 启动命令
CMD ["nginx", "-g", "daemon off;"]