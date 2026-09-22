# 基础
+ <font style="color:rgb(51, 51, 51);">基于角色的权限访问控制（Role-Based Access Control）</font>
+ <font style="color:rgb(51, 51, 51);">RBAC（Role-Based Access Control，基于角色的访问控制），就是用户通过角色与权限进行关联</font>
+ <font style="color:rgb(51, 51, 51);">一个用户拥有若干角色,每一个角色拥有若干权限。这样，就构造成</font>`<font style="color:rgb(111, 89, 144);background-color:rgb(237, 237, 247);">用户-角色-权限</font>`<font style="color:rgb(51, 51, 51);">的授权模型</font>
+ <font style="color:rgb(51, 51, 51);">在这种模型中，用户与角色之间，角色与权限之间一般是多对多的关系</font>
+ <font style="color:rgb(51, 51, 51);">在RBAC中最重要的概念包括：用户(User)，角色(Role)，权限(Permission)</font>

## <font style="color:rgb(51, 51, 51);">示意图</font>
<!-- 这是一张图片，ocr 内容为：RBAC 操作 用户 角色 功能A 用户A 角色A 功能B 用户B 功能C 角色B 用户C 功能D 角色. 功能.. 用户. -->
![](https://cdn.nlark.com/yuque/0/2025/png/738210/1743672454601-4c337eb0-eba0-4968-a28a-23008d65a6a6.png)

## <font style="color:rgb(51, 51, 51);">表设计</font>
### <font style="color:rgb(51, 51, 51);">用户表(users)</font>
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** | **<font style="color:rgb(51, 51, 51);">默认</font>** |
| :--- | :--- | :--- | --- |
| <font style="color:rgb(51, 51, 51);">id</font> | <font style="color:rgb(51, 51, 51);">ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |  |
| <font style="color:rgb(51, 51, 51);">userName</font> | <font style="color:rgb(51, 51, 51);">用户名</font> | <font style="color:rgb(51, 51, 51);">varchar(50)</font> |  |
| <font style="color:rgb(51, 51, 51);">password</font> | <font style="color:rgb(51, 51, 51);">密码</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">email</font> | <font style="color:rgb(51, 51, 51);">邮箱</font> | <font style="color:rgb(51, 51, 51);">varchar(100)</font> |  |
| <font style="color:rgb(51, 51, 51);">phone</font> | <font style="color:rgb(51, 51, 51);">手机号</font> | <font style="color:rgb(51, 51, 51);">varchar(20)</font> |  |
| <font style="color:rgb(51, 51, 51);">isActive</font> | <font style="color:rgb(51, 51, 51);">是否启用</font> | <font style="color:rgb(51, 51, 51);">tinyint</font> | 1 |
| <font style="color:rgb(51, 51, 51);">lastLogin</font> | <font style="color:rgb(51, 51, 51);">最后登录时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |
| <font style="color:rgb(51, 51, 51);">createdAt</font> | <font style="color:rgb(51, 51, 51);">创建时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |
| <font style="color:rgb(51, 51, 51);">updatedAt</font> | <font style="color:rgb(51, 51, 51);">更新时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |


```sql
--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `lastLogin` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_fe0bb3f6520ee0469504521e71` (`username`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES 
(1,'admin','$2b$10$kxcoZWyjk/LaKXrRVE61CugFZUqqy4GoY2.atL7ciaJrHL9BbZ99G','admin@163.com','13800138001',1,'2025-04-03 17:22:04','2025-04-02 17:44:00.924489','2025-04-03 17:22:04.000000'),
(3,'gwb','$2b$10$UPbPyH.8osusrXmn37YEQ.w1F3CflaPhs5n3Df1fbvxHqT2QIioRK','gwb@163.com','18423456789',1,'2025-04-03 16:27:20','2025-04-03 16:20:42.390952','2025-04-03 16:49:58.302840');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

```

### <font style="color:rgb(51, 51, 51);">角色表(roles)</font>
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** | **<font style="color:rgb(51, 51, 51);">默认</font>** |
| :--- | :--- | :--- | --- |
| <font style="color:rgb(51, 51, 51);">id</font> | <font style="color:rgb(51, 51, 51);">ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |  |
| <font style="color:rgb(51, 51, 51);">name</font> | <font style="color:rgb(51, 51, 51);">名称</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">description</font> | <font style="color:rgb(51, 51, 51);">描述</font> | <font style="color:rgb(51, 51, 51);">varchar(200)</font> |  |
| <font style="color:rgb(51, 51, 51);">isActive</font> | <font style="color:rgb(51, 51, 51);">是否启用</font> | <font style="color:rgb(51, 51, 51);">tinyint</font> | 1 |
| <font style="color:rgb(51, 51, 51);">createdAt</font> | <font style="color:rgb(51, 51, 51);">创建时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |
| <font style="color:rgb(51, 51, 51);">updatedAt</font> | <font style="color:rgb(51, 51, 51);">更新时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |


```sql

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_648e3f5447f725579d7d4ffdfb` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'系统管理员','系统管理员，拥有所有权限',1,'2025-04-02 17:44:00.825228','2025-04-03 14:57:22.000000'),(2,'普通用户','普通用户，拥有基础功能权限',1,'2025-04-02 17:44:00.830237','2025-04-03 14:57:12.000000'),(3,'VIP用户','VIP用户,拥有VIP功能权限',1,'2025-04-03 15:00:33.288098','2025-04-03 16:22:11.000000'),(6,'admin','系统管理员，拥有所有权限',1,'2025-04-03 16:49:05.390412','2025-04-03 16:49:05.390412'),(7,'user','普通用户，拥有基础功能权限',1,'2025-04-03 16:49:05.436259','2025-04-03 16:49:05.436259');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;

--
-- Table structure for table `user_roles`
--
```

### <font style="color:rgb(51, 51, 51);">权限表(permission)</font>
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** | **<font style="color:rgb(51, 51, 51);">默认</font>** |
| :--- | :--- | :--- | --- |
| <font style="color:rgb(51, 51, 51);">id</font> | <font style="color:rgb(51, 51, 51);">ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |  |
| <font style="color:rgb(51, 51, 51);">name</font> | <font style="color:rgb(51, 51, 51);">名称</font> | <font style="color:rgb(51, 51, 51);">varchar(50)</font> |  |
| <font style="color:rgb(51, 51, 51);">code</font> | <font style="color:rgb(51, 51, 51);">编码</font> | <font style="color:rgb(51, 51, 51);">varchar(100)</font> |  |
| <font style="color:rgb(51, 51, 51);">description</font> | <font style="color:rgb(51, 51, 51);">描述</font> | <font style="color:rgb(51, 51, 51);">varchar(200)</font> |  |
| <font style="color:rgb(51, 51, 51);">resourceType</font> | <font style="color:rgb(51, 51, 51);">类型</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">isActive</font> | <font style="color:rgb(51, 51, 51);">是否启用</font> | <font style="color:rgb(51, 51, 51);">tinyint</font> | 1 |
| <font style="color:rgb(51, 51, 51);">createdAt</font> | <font style="color:rgb(51, 51, 51);">创建时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |
| <font style="color:rgb(51, 51, 51);">updatedAt</font> | <font style="color:rgb(51, 51, 51);">更新时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |


```sql

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `resourceType` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_48ce552495d14eae9b187bb671` (`name`),
  UNIQUE KEY `IDX_8dad765629e83229da6feda1c1` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES 
(1,'查看用户列表','user:list','允许查看用户列表',1,'user','2025-04-02 17:44:00.742869','2025-04-02 17:44:00.742869'),
(2,'查看用户详情','user:read','允许查看用户详情',1,'user','2025-04-02 17:44:00.760480','2025-04-02 17:44:00.760480'),
(3,'创建用户','user:create','允许创建新用户',1,'user','2025-04-02 17:44:00.765798','2025-04-02 17:44:00.765798'),
(4,'更新用户','user:update','允许更新用户信息',1,'user','2025-04-02 17:44:00.769759','2025-04-02 17:44:00.769759'),
(5,'删除用户','user:delete','允许删除用户',1,'user','2025-04-02 17:44:00.774658','2025-04-02 17:44:00.774658'),
(6,'查看角色列表','role:list','允许查看角色列表',1,'role','2025-04-02 17:44:00.778997','2025-04-02 17:44:00.778997'),
(7,'查看角色详情','role:read','允许查看角色详情',1,'role','2025-04-02 17:44:00.784267','2025-04-02 17:44:00.784267'),
(8,'创建角色','role:create','允许创建新角色',1,'role','2025-04-02 17:44:00.789261','2025-04-02 17:44:00.789261'),
(9,'更新角色','role:update','允许更新角色信息',1,'role','2025-04-02 17:44:00.794554','2025-04-02 17:44:00.794554'),
(10,'删除角色','role:delete','允许删除角色',1,'role','2025-04-02 17:44:00.799017','2025-04-02 17:44:00.799017'),
(11,'查看权限列表','permission:list','允许查看权限列表',1,'permission','2025-04-02 17:44:00.803500','2025-04-02 17:44:00.803500'),
(12,'查看权限详情','permission:read','允许查看权限详情',1,'permission','2025-04-02 17:44:00.808400','2025-04-02 17:44:00.808400'),
(13,'创建权限','permission:create','允许创建新权限',1,'permission','2025-04-02 17:44:00.811799','2025-04-02 17:44:00.811799'),
(14,'更新权限','permission:update','允许更新权限信息',1,'permission','2025-04-02 17:44:00.814992','2025-04-02 17:44:00.814992'),
(15,'删除权限','permission:delete','允许删除权限',1,'permission','2025-04-02 17:44:00.819728','2025-04-02 17:44:00.819728');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;

--
-- Table structure for table `role_permissions`
--
```

### <font style="color:rgb(51, 51, 51);">角色用户表(user_roles)</font>
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">role_id</font> | <font style="color:rgb(51, 51, 51);">角色ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |
| <font style="color:rgb(51, 51, 51);">user_id</font> | <font style="color:rgb(51, 51, 51);">用户ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |


```sql

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `IDX_87b8888186ca9769c960e92687` (`user_id`),
  KEY `IDX_b23c65e50a758245a33ee35fda` (`role_id`),
  CONSTRAINT `FK_87b8888186ca9769c960e926870` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_b23c65e50a758245a33ee35fda1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1),(3,2);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
```

### <font style="color:rgb(51, 51, 51);">角色权限(role_permission)</font>
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(51, 51, 51);">role_id</font> | <font style="color:rgb(51, 51, 51);">角色ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |
| <font style="color:rgb(51, 51, 51);">permission_id</font> | <font style="color:rgb(51, 51, 51);">资源ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |


```sql

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `IDX_178199805b901ccd220ab7740e` (`role_id`),
  KEY `IDX_17022daf3f885f7d35423e9971` (`permission_id`),
  CONSTRAINT `FK_17022daf3f885f7d35423e9971e` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `FK_178199805b901ccd220ab7740ec` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES 
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),
(2,1),(2,2),(2,6),(2,7),(2,11),(2,12),
(3,1),(3,2),
(6,1),(6,2),(6,3),(6,4),(6,5),(6,6),(6,7),(6,8),(6,9),(6,10),(6,11),(6,12),(6,13),(6,14),(6,15),
(7,1),(7,2),(7,6),(7,7),(7,11),(7,12);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
```

### 日志表
| **<font style="color:rgb(51, 51, 51);">字段</font>** | **<font style="color:rgb(51, 51, 51);">字段名</font>** | **<font style="color:rgb(51, 51, 51);">类型</font>** | **<font style="color:rgb(51, 51, 51);">默认</font>** |
| :--- | :--- | :--- | --- |
| <font style="color:rgb(51, 51, 51);">id</font> | <font style="color:rgb(51, 51, 51);">ID</font> | <font style="color:rgb(51, 51, 51);">int</font> |  |
| <font style="color:rgb(51, 51, 51);">action</font> | <font style="color:rgb(51, 51, 51);">操作</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">module</font> | <font style="color:rgb(51, 51, 51);">模块</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">description</font> | <font style="color:rgb(51, 51, 51);">描述</font> | <font style="color:rgb(51, 51, 51);">text</font> |  |
| <font style="color:rgb(51, 51, 51);">data</font> | <font style="color:rgb(51, 51, 51);">数据</font> | <font style="color:rgb(51, 51, 51);">text</font> |  |
| <font style="color:rgb(51, 51, 51);">ip</font> | <font style="color:rgb(51, 51, 51);">IP地址</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">userAgent</font> | <font style="color:rgb(51, 51, 51);">userAgent</font> | <font style="color:rgb(51, 51, 51);">varchar(255)</font> |  |
| <font style="color:rgb(51, 51, 51);">createdAt</font> | <font style="color:rgb(51, 51, 51);">创建时间</font> | <font style="color:rgb(51, 51, 51);">datetime</font> |  |
| <font style="color:rgb(51, 51, 51);">user_id</font> | <font style="color:rgb(51, 51, 51);">用户id</font> | <font style="color:rgb(51, 51, 51);">int</font> |  |


```sql

--
-- Table structure for table `action_logs`
--

DROP TABLE IF EXISTS `action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `action_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(255) NOT NULL,
  `module` varchar(255) DEFAULT NULL,
  `description` text,
  `data` text,
  `ip` varchar(255) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_1174018b7357cd7965ae1ade1c5` (`user_id`),
  CONSTRAINT `FK_1174018b7357cd7965ae1ade1c5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `action_logs`
--

/*!40000 ALTER TABLE `action_logs` DISABLE KEYS */;
INSERT INTO `action_logs` VALUES 
(1,'LOGIN','AUTH','用户登录: admin',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 10:22:51.154703',1),
(2,'UPDATE','USER','更新用户: admin',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 14:16:28.926761',1),
(3,'CREATE','USER','创建用户: gwb',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 14:20:00.088996',1),
(4,'UPDATE','ROLE','更新角色: 普通用户',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 14:57:12.314523',1),
(5,'UPDATE','ROLE','更新角色: 系统管理员',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 14:57:22.777639',1),
(6,'CREATE','ROLE','创建角色: VIP用户',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 15:00:33.306414',1),
(7,'UPDATE','ROLE','更新角色: VIP用户',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 16:22:11.791839',1),
(7,'LOGIN','AUTH','用户登录: gwb',NULL,'::ffff:127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36','2025-04-03 16:27:20.421227',3);
/*!40000 ALTER TABLE `action_logs` ENABLE KEYS */;
```

### <font style="color:rgb(51, 51, 51);">数据库脚本</font>
+ [rbac_system.sql](https://www.yuque.com/attachments/yuque/0/2025/sql/738210/1743674020555-29cb2d5b-9298-4dfc-bbfd-33f7f4c1cc5f.sql)

# 项目实战
[GitHub - lotosv2010/g-rbac: 通用的权限系统](https://github.com/lotosv2010/g-rbac)

# 参考
[Sequelize 简介 | Sequelize中文文档 | Sequelize中文网](https://www.sequelize.cn/)

[前端鉴权知识学习](https://zhuanlan.zhihu.com/p/127791614)



[web开发常见的鉴权方式 - 奋斗的大橙子 - 博客园](https://www.cnblogs.com/dcz2015/p/11725862.html)

