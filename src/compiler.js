(function (exports) {
  var util, T, S, Types;
  if (typeof process !== "undefined") {
    util = require("./util.js");
    T = require("./estransform.js");
    S = require("./scope.js");
    Types = require("./types.js");
  } else if (typeof snarf !== "undefined") {
    util = this.util;
    T = estransform;
    load("./types.js");
    Types = this.Types;
    load("./scope.js");
    S = scope;
  } else {
    util = this.util;
    T = estransform;
    S = scope;
    Types = this.Types;
  }


  /**
   * Import nodes.
   */
  const Node = T.Node;
  const Literal = T.Literal;
  const Identifier = T.Identifier;
  const ArrayExpression = T.ArrayExpression;
  const VariableDeclaration = T.VariableDeclaration;
  const VariableDeclarator = T.VariableDeclarator;
  const MemberDeclarator = T.MemberDeclarator;
  const MemberExpression = T.MemberExpression;
  const BinaryExpression = T.BinaryExpression;
  const SequenceExpression = T.SequenceExpression;
  const CallExpression = T.CallExpression;
  const AssignmentExpression = T.AssignmentExpression;
  const ExpressionStatement = T.ExpressionStatement;
  const ReturnStatement = T.ReturnStatement;
  const Program = T.Program;
  const FunctionDeclaration = T.FunctionDeclaration;
  const FunctionExpression = T.FunctionExpression;
  const ConditionalExpression = T.ConditionalExpression;
  const ObjectExpression = T.ObjectExpression;
  const UnaryExpression = T.UnaryExpression;
  const NewExpression = T.NewExpression;
  const UpdateExpression = T.UpdateExpression;
  const ForStatement = T.ForStatement;
  const BlockStatement = T.BlockStatement;
  const CatchClause = T.CatchClause;
  const ThisExpression = T.ThisExpression;
  const TypeAliasDirective = T.TypeAliasDirective;
  const CastExpression = T.CastExpression;

  function literal(x) {
    return new Literal(x);
  }

  /**
   * Import utilities.
   */
  const assert = util.assert;
  const quote = util.quote;
  const clone = util.clone;
  const extend = util.extend;
  const cast = util.cast;
  const isInteger = util.isInteger;
  const isPowerOfTwo = util.isPowerOfTwo;
  const log2 = util.log2;
  const div4 = util.div4;
  const isAlignedTo = util.isAlignedTo;
  const alignTo = util.alignTo;
  const dereference = util.dereference;
  const realign = util.realign;
  const forceType = util.forceType;

  /**
   * Import scopes.
   */
  const Variable = S.Variable;
  const Scope = S.Scope;
  const Frame = S.Frame;
  const getCachedLocal = S.getCachedLocal;

  /**
   * Import types.
   */
  const TypeAlias = Types.TypeAlias;
  const PrimitiveType = Types.PrimitiveType;
  const StructType = Types.StructType;
  const StructStaticType = Types.StructStaticType;
  const PointerType = Types.PointerType;
  const ArrayType = Types.ArrayType;
  const ArrowType = Types.ArrowType;

  /**
   * Misc utility functions.
   */

  function check(condition, message, warn) {
    if (!condition) {
      if (warn) {
        logger.warn(message);
      } else {
        logger.error(message);

        var e = new Error(message);
        var loc = logger.context[logger.context.length - 1].loc;
        if (loc) {
          e.lineNumber = loc.start.line;
        }
        e.logged = true;
        throw e;
      }
    }
  }

  /**
   * Pass 1: resolve type synonyms and do some type sanity checking
   */

  T.Type.prototype.reflect = function (o) {
    var ty = this.construct().resolve(o.types);
    if (ty !== undefined) {
      ty.lint();
    }
    return ty;
  };

  T.TypeIdentifier.prototype.construct = function () {
    var ty = new TypeAlias(this.name);
    ty.node = this;
    return ty;
  };

  T.PointerType.prototype.construct = function () {
    var ty = new PointerType(this.base.construct());
    ty.node = this;

    if (this.arraySize) {
      ty.arraySize = this.arraySize;
    }
    return ty;
  };

  T.ArrayType.prototype.construct = function () {
    var ty = new ArrayType(this.base.construct());
    ty.node = this;
    if (this.length) {
      ty.length = this.length;
    }
    return ty;
  };

  T.MemberDeclarator.prototype.construct = function () {
    return {
      name: this.declarator.id.name,
      isStatic: this.modifiers.indexOf("static") >= 0,
      type: this.declarator.decltype.construct()
    };
  };

  T.StructType.prototype.construct = function construct() {
    var ty = new StructType(this.id ? this.id.name : undefined);
    var sty = ty.staticType;
    ty.node = this;
    this.members.forEach(function (m) {
      var member = m.construct();
      (member.isStatic ? sty : ty).members.push(member);
    });
    ty.isUnion = this.isUnion;
    logger.info("Constructed Type: " + ty.name);
    return ty;
  };

  T.ArrowType.prototype.construct = function () {
    return new ArrowType(this.params.map(function (p) { return p.construct(); }),
                         this.return.construct());
  };

  function startResolving(ty) {
    if (ty._resolving) {
      console.error("infinite type");
    }
    ty._resolving = true;
  };

  function finishResolving(ty) {
    delete ty._resolving;
    ty._resolved = true;
  };

  PrimitiveType.prototype.resolve = function () {
    return this;
  };

  TypeAlias.prototype.resolve = function (types, inPointer) {
    startResolving(this);
    check(this.name in types, "unable to resolve type name " + quote(this.name));
    var ty = types[this.name];
    finishResolving(this);
    if (inPointer && ty instanceof TypeAlias) {
      ty = ty.resolve(types, inPointer);
    }
    return ty;
  };

  PointerType.prototype.resolve = function (types) {
    if (this._resolved) {
      return this;
    }
    startResolving(this);
    this.base = this.base.resolve(types, true);
    if (this.arraySize) {
      this.size = this.base.size * this.arraySize;
    }
    finishResolving(this);
    return this;
  };

  ArrayType.prototype.resolve = function (types) {
    if (this._resolved) {
      return this;
    }
    startResolving(this);
    this.base = this.base.resolve(types, true);
    if (this.length) {
      this.size = this.base.size * this.length;
    }
    finishResolving(this);
    return this;
  };

  StructType.prototype.resolve = function (types) {
    if (this._resolved) {
      return this;
    }
    startResolving(this);
    var member, members = this.members;
    for (var i = 0, j = members.length; i < j; i++) {
      member = members[i];
      if (member.type) {
        member.type = member.type.resolve(types);
        if (member.type instanceof ArrowType) {
          member.type.paramTypes.unshift(new PointerType(this));
        }
      }
    }
    if (this.staticType !== this) {
      this.staticType.resolve(types);
    }
    finishResolving(this);
    return this;
  };

  ArrowType.prototype.resolve = function (types) {
    if (this._resolved) {
      return this;
    }

    var paramTypes = this.paramTypes;
    for (var i = 0, j = paramTypes.length; i < j; i++) {
      if (paramTypes[i]) {
        paramTypes[i] = paramTypes[i].resolve(types);
      }
    }
    if (this.returnType) {
      this.returnType = this.returnType.resolve(types);
    }
    return this;
  };

  PointerType.prototype.lint = function () {
    check(this.base, "pointer without base type");
    // check(this.base.size, "cannot take pointer of size 0 type " + quote(Types.tystr(this.base, 0)));
  };

  ArrayType.prototype.lint = function () {
    check(this.base, "array without element type");
    this.base.lint();
    this.align = this.base.align;
  };

  StructType.prototype.lint = function () {
    var maxAlignSize = 1;
    var maxAlignSizeType = Types.u8ty;
    var members = this.members;
    var field, type;
    var prev = { offset: 0, type: { size: 0 } };
    for (var i = 0, j = members.length; i < j; i++) {
      // Ignore member instance functions.
      if (members[i].type instanceof ArrowType) {
        continue;
      }

      this.fields.push(field = members[i]);
      type = field.type;

      // Recursively lint field types.
      if (type) {
        type.lint();
      }

      check(type, "cannot have untyped field");
      check(type.size, "cannot have fields of size 0 type " + quote(Types.tystr(type, 0)));

      if (type.align.size > maxAlignSize) {
        maxAlignSize = type.align.size;
        maxAlignSizeType = type.align;
      }
      if (this.isUnion) {
        field.offset = 0;
      } else {
        field.offset = alignTo(prev.offset + prev.type.size, type.size);
        prev = field;
      }
    }
    if (field) {
      this.size = alignTo(field.offset + field.type.size, maxAlignSize);
    } else {
      this.size = 0;
    }
    this.align = maxAlignSizeType;
    if (this.staticType !== this) {
      this.staticType.lint();
    }
  };

  ArrowType.prototype.lint = function () {
    var paramTypes = this.paramTypes;
    for (var i = 0, j = paramTypes.length; i < j; i++) {
      if (paramTypes[i]) {
        paramTypes[i].lint();
      }
    }
    if (this.returnType) {
      this.returnType.lint();
    }
  };

  function resolveAndLintTypes(root, types) {
    var s, stmts = root.body;
    var alias, aliases = [];
    var ty;
    for (var i = 0, j = stmts.length; i < j; i++) {
      s = stmts[i];
      if (s instanceof TypeAliasDirective) {
        alias = s.alias.name;
        if ((s.original instanceof T.StructType) && s.original.id) {
          types[alias] = types[s.original.id.name] = s.original.construct();
          aliases.push(s.original.id.name);
        } else {
          types[alias] = s.original.construct();
        }
        aliases.push(alias);
      } else if ((s instanceof T.StructType) && s.id) {
        types[s.id.name] = s.construct();
        aliases.push(s.id.name);
      }
    }

    for (var i = 0, j = aliases.length; i < j; i++) {
      ty = types[aliases[i]];
      logger.push(ty.node);
      ty = ty.resolve(types);
      ty.lint();
      types[aliases[i]] = ty;
      logger.pop();
    }

    return types;
  }

  /**
   * Pass 2: build scope information and lint inline types
   */

  function isNull(node) {
    return node instanceof Literal && (node.value === null || node.value === 0);
  }

  Node.prototype.scan = T.makePass("scan", "scanNode");

  function scanList(list, o) {
    for (var i = 0, j = list.length; i < j; i++) {
      if (list[i]) {
        list[i].scan(o);
      }
    }
  }

  T.Type.prototype.scan = function (o) {
    return this;
  };

  Program.prototype.scan = function (o) {
    o = extend(o);

    var types = o.types;
    var scope = new Frame(null, "Program");
    o.scope = this.frame = scope;

    // scope.addVariable(new Variable("exports"), true);
    // scope.addVariable(new Variable("require"), true);
    // scope.addVariable(new Variable("load"), true);

    // scope.addVariable(scope.freshVariable("malloc", Types.mallocTy), true);
    // scope.addVariable(scope.freshVariable("free", Types.freeTy), true);
    scope.addVariable(scope.freshVariable("memcpy", Types.memcpyTy), true);
    scope.addVariable(scope.freshVariable("memset", Types.memsetTy), true);

    scope.addVariable(scope.freshVariable("U1", new Types.ArrayType(Types.u8ty)), true);
    scope.addVariable(scope.freshVariable("I1", new Types.ArrayType(Types.i8ty)), true);
    scope.addVariable(scope.freshVariable("U2", new Types.ArrayType(Types.u16ty)), true);
    scope.addVariable(scope.freshVariable("I2", new Types.ArrayType(Types.i16ty)), true);
    scope.addVariable(scope.freshVariable("U4", new Types.ArrayType(Types.u32ty)), true);
    scope.addVariable(scope.freshVariable("I4", new Types.ArrayType(Types.i32ty)), true);
    scope.addVariable(scope.freshVariable("F4", new Types.ArrayType(Types.f32ty)), true);
    scope.addVariable(scope.freshVariable("F8", new Types.ArrayType(Types.f64ty)), true);

    scope.addVariable(
        scope.freshVariable("sqrt", new Types.ArrowType([Types.f32ty], Types.f32ty)), true
    );

    logger.push(this);
    scanList(this.body, o);
    logger.pop();

    return this;
  };

  MemberDeclarator.prototype.scan = function (o) {
    if (this.declarator instanceof FunctionDeclaration) {
      this.declarator.scan(o);
    }
  };

  TypeAliasDirective.prototype.scan = function (o) {
    if (this.original instanceof T.StructType) {
      var structName = this.original.id.name;
      var structType = o.types[structName];
      o.scope.addVariable(new Variable(structType.name, structType.staticType));
      var io = extend(o, {
        thisTy: new PointerType(structType),
        scope: new Frame(o.scope, "Struct " + structName)
      });
      var so = extend(o, {
        thisTy: new PointerType(structType.staticType),
        scope: new Frame(o.scope, "Static Struct " + structName)
      });
      var members = this.original.members;
      for (var i = 0; i < members.length; i++) {
        var isStatic = members[i].modifiers.indexOf("static");
        members[i].scan(isStatic >= 0 ? so : io);
      }
    }
    return this;
  };

  FunctionExpression.prototype.scan =
  FunctionDeclaration.prototype.scan = function (o) {
    logger.push(this);
    var scope = o.scope;

    var ty;
    if (this.decltype) {
      ty = this.decltype.reflect(o);
    }
    if (this.id) {
      logger.push(this.id);
      scope.addVariable(new Variable(this.id.name, ty));
      logger.pop();
    }

    o = extend(o);
    scope = new Frame(scope, "Function " + (this.id ? this.id.name : "anonymous"));
    scope.returnType = ty.returnType;
    o.scope = this.frame = scope;

    if (o.thisTy) {
      var variable = new Variable("this", o.thisTy);
      scope.addVariable(variable);
    }

    var params = this.params;
    var parameters = this.parameters = [];
    var variable;
    for (var i = 0, j = params.length; i < j; i++) {
      logger.push(params[i]);
      variable = new Variable(params[i].name, ty.paramTypes[i]);
      scope.addVariable(variable);
      parameters.push(variable);
      logger.pop();
    }

    assert(this.body instanceof BlockStatement);
    scanList(this.body.body, o);

    logger.pop();
    return this;
  };

  VariableDeclaration.prototype.scan = function (o) {
    logger.push(this);

    check(this.kind === "let" || this.kind === "const" || this.kind === "extern",
          "Only block scoped variable declarations are allowed, use the " + quote("let") + " keyword instead.");

    /* Only emit vars, we mangle names ourselves. */
    if (this.kind === "let") {
      this.kind = "var";
    }

    scanList(this.declarations, extend(o, { declkind: this.kind }));

    logger.pop();
    return this;
  };

  VariableDeclarator.prototype.scanNode = function (o) {
    var types = o.types;
    var scope = o.scope;

    var name = this.id.name;
    var ty = this.decltype ? this.decltype.reflect(o) : undefined;

     check(!scope.getVariable(name, true),
          "Variable " + quote(name) + " is already declared in local scope.");

    scope.addVariable(new Variable(name, ty), o.declkind === "extern");
  };

  ForStatement.prototype.scan = function (o) {
    o = extend(o);
    o.scope = this.scope = new Scope(o.scope, "ForStatement", "block");
    Node.prototype.scan.call(this, o);
    return this;
  };

  // Note: Does not handle conditional catch clauses
  // Then again, neither does esprima
  CatchClause.prototype.scan = function (o) {
    logger.push(this);

    this.body.scan(o);

    logger.push(this.param);
    this.body.scope.addVariable(new Variable(this.param.name, undefined));
    logger.pop();

    logger.pop();
    return this;
  };

  BlockStatement.prototype.scan = function (o) {
    o = extend(o);
    o.scope = this.scope = new Scope(o.scope, "BlockStatement", "block");
    scanList(this.body, o);
    return this;
  };

  /**
   * Pass 3: type transform
   */

  PrimitiveType.prototype.assignableFrom = function (other) {
    if(this === Types.voidTy) {
      return other === Types.voidTy;
    }
      
    if (other instanceof PrimitiveType ||
        other instanceof PointerType) {
      return true;
    }
    return false;
  };

  StructType.prototype.assignableFrom = function (other) {
    return this === other;
  };

  PointerType.prototype.assignableFrom = function (other) {
    if (other === Types.nullTy
        || (other instanceof PointerType && this.base.assignableFrom(other.base))
        || (other instanceof PrimitiveType && other.integral)) {
      return true;
    }
    return false;
  };

  ArrowType.prototype.assignableFrom = function (other) {
    if (!(other instanceof ArrowType)) {
      return false;
    }

    var paramTypes = this.paramTypes;
    var otherParamTypes = other.paramTypes;

    for (var i = 0, j = paramTypes.length; i < j; i++) {
      if (otherParamTypes.length <= i) {
        if (paramTypes[i] !== undefined) {
          // Other arrow has too few params, and this param isn't dyn
          return false;
        } else {
          continue;
        }
      }

      if (paramTypes[i] === undefined) {
        if (otherParamTypes[i] !== undefined) {
          return false;
        }
      } else {
        if (!paramTypes[i].assignableFrom(otherParamTypes[i])) {
          return false;
        }
      }
    }

    for (var i = paramTypes.length, j = otherParamTypes.length; i < j; i++) {
      if (otherParamTypes[i] !== undefined) {
        // Other arrow has more typed params
        return false;
      }
    }

    if (this.returnType === undefined) {
      return other.returnType === undefined;
    }

    return this.returnType.assignableFrom(other.returnType);
  };

  Node.prototype.transform = T.makePass("transform", "transformNode");

  function compileList(list, o) {
    var translist = [];
    var trans;
    for (var i = 0, j = list.length; i < j; i++) {
      trans = list[i].transform(o);
      if (trans !== null) {
        translist.push(trans ? trans : list[i]);
      }
    }
    return translist;
  }

  TypeAliasDirective.prototype.transform = function (o) {
    var functions = [];
    if (this.original instanceof T.StructType) {
      var members = this.original.members;
      for (var i = 0; i < members.length; i++) {
        var name = this.original.id.name;
        var member = members[i];
        if (member.declarator instanceof FunctionDeclaration) {
          if (members[i].modifiers.indexOf("static") >= 0) {
            name += "_Static";
          }
          var functionDeclaration = member.declarator;
          var fnName = functionDeclaration.id.name;

          functionDeclaration.params.unshift(
              new Identifier('thisPtr')
          );
          functionDeclaration.id.name = name + "$" + fnName;
          functions.push(functionDeclaration.transform(o));
        }
      }
    }
    if (functions.length) {
      return new BlockStatement(functions, true);
    }
    return null;
  };

  Program.prototype.transform = function (o) {
    o = extend(o);
    o.scope = this.frame;

    // Move all global variable declarations to the top
    var decls = [];
    var body = [];
    for(var i=0; i<this.body.length; i++) {
      var node = this.body[i];

      if(node instanceof VariableDeclaration) {
        if(node.kind == 'extern') {
          continue;
        }

        for(var j=0; j<node.declarations.length; j++) {
          var decl = node.declarations[j];
          var variable = o.scope.getVariable(decl.id.name);

          if(!variable.isStackAllocated) {
            logger.push(decl);
            check(decl.init, ('Global variable ' + quote(decl.id) +
                              ' must have an initializer'));
            check(decl.init instanceof Literal,
                  'Global variable ' + quote(decl.id) + 
                  ' must be a constant literal');
            logger.pop();
          }

          variable.global = true;
          decl.global = true;
        }

        node.global = true;
        decls.push(node);
      }
      else {
        body.push(node);
      }
    }

    this.body = compileList(decls.concat(body), o);
    this.frame.close();

    var globalSP = new VariableDeclaration(
      'var',
      [new VariableDeclarator(new Identifier('globalSP'),
                              new Literal(this.frame.frameSize),
                              Types.u32ty)]
    );

    this.body.unshift(globalSP);
    return this;
  };

  FunctionExpression.prototype.transform =
  FunctionDeclaration.prototype.transform = function (o) {
    o = extend(o);
    o.scope = this.frame;
      
    assert(this.body instanceof BlockStatement);
    this.body.body = compileList(this.body.body, o);
    this.frame.close();

    return cast(this, this.decltype.reflect(o));
  };

  ForStatement.prototype.transform = function (o) {
    o = extend(o);
    o.scope = this.scope;
    return Node.prototype.transform.call(this, o);
  };

  ForStatement.prototype.transformNode = function(o) {
    if(this.init instanceof ExpressionStatement) {
      this.init = this.init.expression.expressions[0];
    }
  };

  BlockStatement.prototype.transform = function (o) {
    o = extend(o);
    o.scope = this.scope;
    this.body = compileList(this.body, o);
    return this;
  };

  CatchClause.prototype.transform = function (o) {
    o = extend(o);
    this.body.transform(o);
    return this;
  };

  CastExpression.prototype.transform = function (o) {
    if (this.as && !(this.ty = this.as.reflect(o))) {
      return this.argument.transform(o);
    }

    o = extend(o);
    o.wantsToBe = this.ty;
    this.argument = this.argument.transform(o);

    return this;
  };

  Literal.prototype.transformNode = function (o) {
    if (this.value === null) {
      return cast(this, Types.nullTy);
    }

    if (typeof this.value === "number") {
      return cast(this, isInteger(this.value) ? Types.i32ty : Types.f64ty);
    }
  };

  ThisExpression.prototype.transformNode = function (o) {
    var scope = o.scope;
    var variable = scope.getVariable("this");
    if (variable) {
      // `this` is actually just a pointer variable named something
      // else that is passed as the first argument
      return cast(new Identifier("thisPtr"), variable.type);
    }
  };

  Identifier.prototype.transformNode = function (o) {
    if (this.kind === "variable" && !this.variable) {
      var scope = o.scope;
      var variable = scope.getVariable(this.name);

      check(variable, "unknown identifier " + quote(this.name) + " in scope " + scope);
      // if (!(variable.type instanceof StructStaticType)) {
      //   check(variable.isStackAllocated ? variable.frame === scope.frame : true,
      //         "cannot close over stack-allocated variables");
      // }

      this.name = variable.name;
      this.variable = variable;

      return cast(this, variable.type);
    }
  };

  VariableDeclaration.prototype.transform = function (o) {
    if (this.kind === "extern") {
      return null;
    }

    var decl, decls = this.declarations;
    var transformed = [];

    for(var i=0; i<decls.length; i++) {
      if((decl = decls[i].transform(o))) { 
        transformed.push(decl);
      }
    }

    this.declarations = transformed;
    return this.transformNode(o);
  };

  VariableDeclaration.prototype.transformNode = function (o) {
    if(!this.global || this.kind == 'extern') {
      // We shouldn't have any variable declarations here, they are
      // created in the prologue (asm.js requirement). Convert these to
      // AssignmentExpression-s if they have an initializer.
      if(this.declarations.length) {
        return new ExpressionStatement(new SequenceExpression(this.declarations));
      }

      return null;
    }
  };

  VariableDeclarator.prototype.transformNode = function (o) {
    var variable = this.id.variable;
    var type = variable.type;

    if (!type) {
      throw new Error('variable types required');
    }

    if (this.arguments) {
      // Does the variable declaration call the constructor?
      var member = type.getMember(type.name);
      if (member) {
        var constructor = new Identifier(type.name + "$" + type.name);
        constructor = cast(constructor, member.type, true);
        var obj = new UnaryExpression("&", this.id, this.loc).transform(o);
        var callConstructor = new CallExpression(constructor, [obj].concat(this.arguments), this.loc).transform(o);
        // TODO: This is kind of retarded.
        return new SequenceExpression([callConstructor, this.id]);
      }
    }
    else if (this.init) {
      if (this.init instanceof ArrayExpression) {
        var rootPointer = cast(this.id, new PointerType(type.getRoot()), true);
        // this.id = o.scope.freshTemp(type, this.loc);
        var elementInitializers = new SequenceExpression([]);
        var generated = 0;
        function generateInitializers(type, elements) {
          check(type.length === elements.length, "Incompatible array initializer.");
          for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element instanceof ArrayExpression) {
              generateInitializers(type.base, element.elements);
            } else {
              elementInitializers.expressions.push (
                new AssignmentExpression (
                  new UnaryExpression("*",
                    new BinaryExpression("+",
                      rootPointer,
                      literal(generated++)
                    )
                  ),
                  "=", element, element.loc
                )
              );
            }
          }
        }
        generateInitializers(type, this.init.elements);
        return elementInitializers.transform(o);
      }
      else {
        var left = this.id;
        var right = this.init;

        if(right instanceof Literal &&
           (type.name == 'f32' || type.name == 'f64')) {
          right.forceDouble = true;
        }

        var assn = (new AssignmentExpression(left, "=", right, this.init.loc)).transform(o);
        
        if(this.global) {
          this.id = assn.left;
          this.init = assn.right;
        }
        else {
          return assn;
        }
      }
    }
    else if (variable.isStackAllocated) {
      //return o.scope.freshTemp(type, this.loc);
      return null;
    }
    else {
      return null;
    }
  };

  ReturnStatement.prototype.transformNode = function (o) {
    var frame = o.scope.frame;
    var returnType = frame.returnType;
    var arg = this.argument;
    var ty = arg ? arg.ty : undefined;
    if (returnType) {
      check(returnType.assignableFrom(ty), "incompatible types: returning " +
            quote(Types.tystr(ty, 0)) + " as " + quote(Types.tystr(returnType, 0)));
      if (arg) {
        this.argument = cast(arg, returnType, false, true);
      }
    }
  };

  const BINOP_ARITHMETIC = ["+", "-", "*", "/", "%"];
  const BINOP_BITWISE    = ["<<", ">>", ">>>", "~", "&", "|"]
  const BINOP_COMPARISON = ["==", "!=", "===", "!==", "<", ">", "<=", ">="]

  ConditionalExpression.prototype.transformNode = function (o) {
    var ty;
    var lty = this.consequent.ty;
    var rty = this.alternate.ty;

    if (typeof lty === "undefined" || typeof rty === "undefined") {
      return this;
    }

    if (lty.assignableFrom(rty)) {
      ty = lty;
    } else if (rty.assignableFrom(lty)) {
      ty = rty;
    }

    return cast(this, ty);
  };

  BinaryExpression.prototype.transformNode = function (o) {
    var ty;
    var lty = this.left.ty;
    var rty = this.right.ty;
    var op = this.operator;

    if (lty instanceof PointerType && (op === "+" || op === "-")) {
      if (rty instanceof PrimitiveType && rty.integral) {
        ty = lty;
      } else if (rty instanceof PointerType && op === "-") {
        check(lty.base.size === rty.base.size,
              "subtraction with incompatible pointer types " +
              quote(lty) + " and " + quote(rty));
        ty = Types.i32ty;
      }
    } else if (BINOP_COMPARISON.indexOf(op) >= 0) {
      if (lty instanceof PointerType && isNull(this.right)) {
        this.right = cast(this.right, lty);
      } else if (rty instanceof PointerType && isNull(this.left)) {
        this.left = cast(this.left, rty);
      }
      else {
        this.left = cast(this.left, lty, true, true);
        this.right = cast(this.right, rty, true, true);
      }

      ty = Types.i32ty;
    } else if (BINOP_BITWISE.indexOf(op) >= 0) {
      ty = Types.i32ty;
    } else if (BINOP_ARITHMETIC.indexOf(op) >= 0 &&
               (lty instanceof PrimitiveType && lty.numeric) &&
               (rty instanceof PrimitiveType && rty.numeric)) {
      // Arithmetic on ints now begets ints, unless it wants to be a wider
      // primitive from an outside cast.
      var wantsToBe;
      if (lty.integral && rty.integral &&
          !(((wantsToBe = o.wantsToBe) instanceof PrimitiveType) &&
            wantsToBe.size > Types.i32ty.size)) {
        // Force a CastExpression here so we convert it during lowering
        // without warnings.

        if(op == '*') {
          // Multiplication of integers is special in asm.js, and
          // requires a call to `imul` instead. See
          // http://asmjs.org/spec/latest/#intish
          return cast(new CallExpression(new Identifier('imul'), [this.left, this.right]),
                      Types.i32ty);
        }

        this.left = cast(this.left, lty, true, true);
        this.right = cast(this.right, rty, true, true);
        return cast(this, Types.i32ty, true);
      }

      // Force the operands to be casted (asm.js is strict about this)
      this.left = cast(this.left, Types.f64ty, true);
      this.right = cast(this.right, Types.f64ty, true);
      ty = Types.f64ty;
    }

    if (ty) {
      return cast(this, ty);
    }
  };

  UnaryExpression.prototype.transform = function (o) {
    var ty;
    var op = this.operator;

    if (op === "sizeof") {
      ty = this.argument.reflect(o);
      return cast(literal(ty.size, this.argument.loc), Types.i32ty);
    }

    var arg = this.argument = this.argument.transform(o);
    ty = arg.ty;

    if (op === "delete" && ty) {
      check(ty instanceof PointerType, "cannot free non-pointer type");
      return (new CallExpression(o.scope.FREE(),
                                 [cast(this.argument, Types.bytePointerTy)], this.loc)).transform(o);
    }

    if (op === "*") {
      check(ty instanceof PointerType, "cannot dereference non-pointer type " + quote(Types.tystr(ty, 0)));
      return cast(this, ty.base);
    }

    if (op === "&") {
      check(ty, "cannot take address of untyped expression");
      if (arg.variable) {
        arg.variable.isStackAllocated = true;
      }
      return cast(this, new PointerType(ty));
    }

    if (op === "!" || op === "~") {
      return cast(this, Types.i32ty);
    }

    if (op === "-") {
      if (arg.ty && arg.ty.numeric) {
        return cast(this, arg.ty);
      }
      return cast(this, Types.f64ty);
    }

    return this;
  };

  NewExpression.prototype.transform = function (o) {
    var ty;
    if (this.callee instanceof Identifier && (ty = o.types[this.callee.name])) {
      var pty = new PointerType(ty)
      var allocation = new CallExpression(o.scope.MALLOC(),
                                          [cast(literal(ty.size), Types.u32ty)], this.loc);
      allocation = cast(allocation.transform(o), pty);
      // Check if we have a constructor ArrowType.
      if (ty instanceof StructType) {
        var member = ty.getMember(ty.name);
        if (member) {
          assert (member.type instanceof ArrowType);
          logger.push(this);
          var tmp = o.scope.freshTemp(pty, this.loc);
          var assignment = new AssignmentExpression(tmp, "=", allocation, this.loc);
          var constructor = new MemberExpression(new Identifier(ty.name + "$" + ty.name), new Identifier("call"), false);
          constructor = cast(constructor, member.type, true);
          var callConstructor = new CallExpression(constructor, [assignment].concat(this.arguments), this.loc).transform(o);
          allocation = new SequenceExpression([callConstructor, tmp], this.loc);
          logger.pop();
          return cast(allocation, pty, true);
        }
      }
      return allocation;
    } else if (this.callee instanceof MemberExpression &&
               this.callee.computed &&
               (ty = o.types[this.callee.object.name])) {
      var size = new BinaryExpression("*", literal(ty.size), this.callee.property, this.loc);
      var allocation = new CallExpression(o.scope.MALLOC(),
                                          [cast(size, Types.u32ty)], this.loc);
      return cast(allocation.transform(o), new PointerType(ty));
    }
    return Node.prototype.transform.call(this, o);
  };

  SequenceExpression.prototype.transformNode = function (o) {
    assert(this.expressions.length);
    var last = this.expressions[this.expressions.length - 1];
    return cast(this, last.ty);
  };

  UpdateExpression.prototype.transformNode = function (o) {
    var arg = this.argument;
    var ty = arg.ty
    if (ty && (ty.integral || ty instanceof PointerType)) {
      var scope = o.scope;
      var op = this.operator === "++" ? "+" : "-";
      var ref = scope.cacheReference(arg);
      var right = new BinaryExpression(op, ref.use, literal(1), this.loc);
      if (this.prefix) {
        return (new AssignmentExpression(ref.def, "=", right, this.loc)).transform(o);
      }
      var t = scope.freshTemp(ty, arg.loc);
      var assn = new AssignmentExpression(t, "=", ref.def, this.loc);
      var incdec = (new AssignmentExpression(ref.use, "=", right, this.loc)).transform(o);
      return cast(new SequenceExpression([assn, incdec, t], this.loc), ty);
    }
  };

  AssignmentExpression.prototype.transformNode = function (o) {
    var lty = this.left.ty;
    var rty = this.right.ty;
    this.left.lvalue = true;

    if (!lty) {
      return;
    }

    var scope = o.scope;
    var op = this.operator;

    if (op !== "=") {
      var binop = op.substr(0, op.indexOf("="));
      var ref = scope.cacheReference(this.left);
      var right = new BinaryExpression(binop, ref.use, this.right, this.right.loc);
      return (new AssignmentExpression(ref.def, "=", right, this.loc)).transform(o);
    }

    check(lty.assignableFrom(rty), "incompatible types: assigning " +
          quote(Types.tystr(rty, 0)) + " to " + quote(Types.tystr(lty, 0)));

    if (lty instanceof StructType) {
      var mc = scope.MEMCPY();
      var size = lty.size;
      var memcpyTy = mc.ty.paramTypes[0];
      var left = cast(new UnaryExpression("&", this.left, this.left.loc), memcpyTy, true);
      var right = cast(new UnaryExpression("&", this.right, this.right.loc), memcpyTy, true);
      return cast(new CallExpression(mc, [left, right, literal(size)]), lty).transform(o);
    } else {
      this.right = cast(this.right, lty);
      return cast(this, lty);
    }
  };

  function MemberFunctionCall (object, member) {
    assert (object.ty instanceof PointerType);
    this.object = object;
    this.member = member;
  }

  MemberExpression.prototype.transformNode = function (o) {
    var obj = this.object;
    var prop = this.property;
    var oty = obj.ty;

    if (!oty) {
      return;
    }

    if (this.computed) {
      check(oty instanceof PointerType, "cannot use [] operator on non-pointer type.");
      return new UnaryExpression("*", new BinaryExpression("+", obj, prop)).transform(o);
    }

    if (this.kind === "->") {
      check(oty instanceof PointerType && (oty.base instanceof StructType),
            "base of struct dereference must be struct or union type.");
      oty = oty.base;
    } else {
      check(!(oty instanceof PointerType), "cannot use . operator on pointer type.");
      if (!(oty instanceof StructType || oty instanceof StructStaticType)) {
        return;
      }
    }

    check(prop instanceof Identifier, "invalid property name.");
    var member = oty.getMember(prop.name);
    check(member, "Unknown member " + quote(prop.name) + " of type " + quote(Types.tystr(oty, 0)));

    // Expressions of the form |o->f(x, y)| need to be translated into |f(o, x, y)|. Here we
    // see the |o->f| part so we mark it as a |MemberFunctionCall| and take care of it when we
    // transform the CallExpression.
    if (member.type instanceof ArrowType) {
      // Normalize the form |o.f| into |&o->f| to simplify things.
      if (!(obj.ty instanceof PointerType)) {
        obj = new UnaryExpression("&", obj, this.loc).transform(o);
      }
      return new MemberFunctionCall(obj, member);
    }

    this.structField = member;
    return cast(this, member.type);
  };

  CallExpression.prototype.transformNode = function (o) {

    if (this.callee instanceof MemberFunctionCall) {
      var obj = this.callee.object;
      var member = this.callee.member;
      var name = obj.ty.base.name + "$" + member.name;
      var fn = cast(new Identifier(name), member.type, true);
      return new CallExpression (
        fn, [this.callee.object].concat(this.arguments)
      ).transform(o);
    }

    var fty = this.callee.ty;
    var args = this.arguments;

    if (!fty) {
      for(var i=0; i<args.length; i++) {
        var unary = args[i] instanceof UnaryExpression;

        // TODO: clean up this hack. if we are calling a function and
        // don't know its types (extern), force the types only on
        // certain expressions to make asm.js happy
        if(args[i] instanceof Identifier ||
           (unary && args[i].operator == '*' ||
            unary && args[i].operator == '&')) {
          args[i] = forceType(args[i]);
        }
      }
      return;
    }

    check(fty instanceof ArrowType, "trying to call non-function type");

    var paramTys = fty.paramTypes;

    check(paramTys.length === args.length,
          "Argument/parameter count mismatch, expected: " + paramTys.length +
          ", received: " + args.length, true);

    for (var i = 0, j = paramTys.length; i < j; i++) {
      var arg = args[i];
      var pty = paramTys[i];
      var aty = arg ? arg.ty : undefined;
      if (pty) {
        if (arg) {
          logger.push(arg);
        }
        check(pty.assignableFrom(aty), "incompatible types: passing " +
              quote(Types.tystr(aty, 0)) + " to " + quote(Types.tystr(pty, 0)));
        logger.pop();
        args[i] = cast(arg, pty);
      }
    }

    return cast(this, fty.returnType);
  };

  /**
   * Pass 4: lowering
   */

  PrimitiveType.prototype.convert = function (expr, force, warn) {
    assert(expr);

    var rty = expr.ty;

    // asm.js requires every expression to be casted
    // if (this === rty) {
    //   return expr;
    // }

    if (!force) {
      check(!(rty instanceof PointerType), "conversion from pointer to " +
            quote(Types.tystr(rty, 0)) + " without cast", true);
    }

    if (!this.numeric) {
      return expr;
    }

    if (!this.integral) {
      // If converting from an integer, force it to signed/unsigned
      // (required by asm.js). This breaks literals however, since
      // right now 6.0 is parsed as an integer, so guard against that.
      if(rty && rty.integral && !(expr instanceof Literal)) {
        expr = forceType(expr);
      }

      return new UnaryExpression("+", expr);

      // if (rty && rty.numeric) {
      //     return expr;
      // }
      // return new CallExpression(new Identifier("Number"), [expr], expr.loc);
    }

    var conversion;
    var lwidth = this.size << 3;
    var rwidth = rty ? rty.size << 3 : 8;
    var lsigned = this.signed;
    var rsigned = rty ? rty.signed : undefined;
    var mask = (1 << lwidth) - 1;
    var shift = 32 - lwidth;
    var errorPrefix;

    // If we're converting a constant, check if it fits.
    if (expr instanceof Literal ||
        (expr instanceof UnaryExpression && expr.argument instanceof Literal)) {
      var val, val2;
      if (expr instanceof Literal) {
        val = expr.value;
      } else {
        switch (expr.operator) {
        case "-":
          val = -expr.argument.value;
          break;
        case "~":
          val = ~expr.argument.value;
          break;
        case "!":
          val = Number(!expr.argument.value);
          break;
        default:
          console.error("oops");
        }
      }

      if (lwidth !== 32 && lwidth < rwidth) {
        val2 = val & mask;
        if (lsigned) {
          val2 = (val2 << shift) >> shift;
        }
      } else if (lwidth !== rwidth || lsigned != rsigned) {
        if (lsigned) {
          val2 = val | 0;
        } else {
          val2 = val >>> 0;
        }
      } else {
        val2 = val;
      }

      if (val === val2) {
        return expr;
      }

      errorPrefix = "constant conversion to " + quote(Types.tystr(this, 0)) + " alters its ";
    } else {
      errorPrefix = "conversion from " + quote(Types.tystr(rty, 0)) + " to " + quote(Types.tystr(this, 0)) + " may alter its ";
    }

    // Allow conversions from dyn without warning.
    if (!force && warn.conversion) {
      check(lwidth === rwidth, errorPrefix + "value", true);
      check(lsigned === rsigned, errorPrefix + "sign", true);
    }


    // Do we need to truncate? Bitwise operators automatically truncate to 32
    // bits in JavaScript so if the width is 32, we don't need to do manual
    // truncation.
    var loc = expr.loc;
    if (lwidth !== 32 && lwidth < rwidth) {
      conversion = new BinaryExpression("&", expr, literal(mask), loc);
      // Do we need to sign extend?
      if (lsigned) {
        conversion = new BinaryExpression("<<", conversion, literal(shift), loc);
        conversion = new BinaryExpression(">>", conversion, literal(shift), loc);
      }
    } else {
      if(rty && !rty.integral) {
        conversion = new UnaryExpression('~~', expr);
      }
      else if(lsigned) {
        conversion = new BinaryExpression("|", expr,
                                          literal(0), loc);
      }
      else {
        conversion = new BinaryExpression(">>>", expr,
                                          literal(0), loc);
      }
    }

    return conversion;
  };

  PointerType.prototype.convert = function (expr, force, warn) {
    // This is important for TI. Returning null here would result in the site
    // being dimorphic.
    if (isNull(expr)) {
      expr.value = 0;
      return expr;
    }

    var rty = expr.ty;
    if (this === rty || !(rty instanceof PointerType)) {
      if (!force) {
        check(!(rty instanceof PrimitiveType && rty.integral), "conversion from " +
              quote(Types.tystr(rty, 0)) + " to pointer without cast", true);
      }
      return expr;
    }

    if (warn.conversion) {
      check(rty.base.align.size >= this.base.align.size, "incompatible pointer conversion from " +
            rty.base.align.size + "-byte aligned " + quote(Types.tystr(rty, 0)) + " to " +
            this.base.align.size + "-byte aligned " + quote(Types.tystr(this, 0)), true);
    }

    return forceType(expr, Types.u32ty);
  };

  StructType.prototype.convert = function (expr) {
    return expr;
  };

  ArrowType.prototype.convert = function (expr) {
    return expr;
  };

  function addMainInitializers(node, o) {
    // Add the stack and heap initializers to the main function
    return [
      new ExpressionStatement(
        new AssignmentExpression(
          new MemberExpression(o.scope.getView(Types.u32ty), literal(1), true),
          '=',
          new BinaryExpression(
            '-',
            new Identifier('totalSize'),
            new Literal(o.frame.root.frameSize)
          )
        )
      ),

      new ExpressionStatement(
        new AssignmentExpression(
          new MemberExpression(o.scope.getView(Types.u32ty), literal(0), true),
          '=',
          literal(4)
        )
      )
    ];
  }

  function createVariableDecls(node, o) {
    var decls = [];
    var frame = o.frame;

    // Any temporary variables
    var cachedLocals = frame.cachedLocals;
    for(var local in cachedLocals) {
      var v = frame.mangles[local];
      var decl = new VariableDeclarator(new Identifier(v.name),
                                        new Literal(v.type.defaultValue || 0));
      if(v.type.numeric && !v.type.integral) {
        decl.init.forceDouble = true;
      }

      decls.push(decl);
    }

    // All the declared variables. We need to declare every single
    // variable in the whole function, so we need to scan all the
    // nodes for all the scopes.
    for(v in frame.scopedVariables) {
      var variable = frame.scopedVariables[v];
      var ty = variable.type;

      // Don't process the `this` variable or any of the arguments
      if(variable.name != 'this' &&
         node.parameters.indexOf(variable) === -1) {
        var decl = new VariableDeclarator(new Identifier(variable.name),
                                          new Literal(ty.defaultValue || 0));
        if(ty.numeric && !ty.integral) {
          decl.init.forceDouble = true;
        }

        decls.push(decl);
      }
    }

    decls.push(new VariableDeclarator(new Identifier('$SP'), new Literal(0)));
    return new VariableDeclaration("var", decls);
  }

  function createPrologue(node, o) {
    assert(node.frame);

    var frame = node.frame;
    var code = [];

    var local, v;
    var constants = [];
    var variables = [];

    if (node.parameters) {
      var params = node.parameters;

      if(node.params.length && node.params[0].name == 'thisPtr') {
        var assn = new AssignmentExpression(
          new Identifier('thisPtr'), '=',
          new BinaryExpression("|", new Identifier('thisPtr'), literal(0))
        );
        code.push(new ExpressionStatement(assn));
      }

      for (var i = 0, j = params.length; i < j; i++) {
        var p = params[i];
        var ty = p.type;

        if(ty.name == 'f32' || ty.name == 'f64') {
          var assn = new AssignmentExpression(
            new Identifier(p.name), '=',
            new UnaryExpression("+", new Identifier(p.name))
          );
          code.push(new ExpressionStatement(assn));
        }
        else {
          var assn = new AssignmentExpression(
            new Identifier(p.name), '=',
            new BinaryExpression("|", new Identifier(p.name), literal(0))
          );
          code.push(new ExpressionStatement(assn));
        }

        // I don't know what the following code is trying to do. Disable
        // passing structs by value.
        if(p.isStackAllocated) {
          throw new Error("cannot pass stack-allocated objects yet");
        }

        //if (!p.isStackAllocated) {
        //  continue;
        //}
        // var assn = new AssignmentExpression(p.getStackAccess(frame), "=", new Identifier(p.name));
        // code.push(new ExpressionStatement(assn));
      }
    }

    code.push(createVariableDecls(node, o));

    if(node.id.name == 'main') {
      code = code.concat(addMainInitializers(node, o));
    }

    var frameSize = frame.frameSize;
    if(frameSize) {
      var allocStack = new AssignmentExpression(
        frame.realSP(), "=", 
        new BinaryExpression("-", forceType(frame.realSP()), literal(frameSize))
      );

      logger.push(allocStack);
      allocStack.lower(o);
      logger.pop();

      code.push(new ExpressionStatement(allocStack));

      var spDecl = new AssignmentExpression(frame.SP(), "=", forceType(frame.realSP()));
      code.push(new ExpressionStatement(spDecl));
    }

    return code;
  }

  function createEpilogue(node, o) {
    assert(node.frame);

    var frame = node.frame;
    var frameSize = frame.frameSize;
    if (frameSize) {
      var exprs = [
        new ExpressionStatement(
          new AssignmentExpression(
            frame.realSP(), "=",
            new BinaryExpression("+", forceType(frame.realSP()),
                                 literal(frameSize))))
      ];

      var unifyRetType = new ReturnStatement(
        new Literal(node.ty.returnType.integral ? 0 : 0.0)
      );
      unifyRetType.argument.forceDouble = !node.ty.returnType.integral;

      exprs.push(unifyRetType);
      return exprs;
    }
    return [];
  }

  function lowerList(list, o) {
    var translist = [];
    var trans;
    for (var i = 0, j = list.length; i < j; i++) {
      trans = list[i].lower(o);
      if (trans !== null) {
        translist.push(trans ? trans : list[i]);
      }
    }
    return translist;
  }


  Node.prototype.lower = T.makePass("lower", "lowerNode");

  Program.prototype.lower = function (o) {
    o = extend(o);
    o.scope = o.frame = this.frame;

    this.body = lowerList(this.body, o);
    // var prologue = createPrologue(this, o);
    // var epilogue = createEpilogue(this, o);
    //this.body = prologue.concat(this.body).concat(epilogue);

    return this;
  };

  FunctionExpression.prototype.lower =
  FunctionDeclaration.prototype.lower = function (o) {
    var memcheckName;
    o = extend(o);
    o.scope = o.frame = this.frame;


    if (o.memcheck) {
      if (this.id && this.id.name) {
        memcheckName = this.id.name;
      } else {
        memcheckName = "<anonymous>";
      }
      this.frame.memcheckFnLoc = {name: memcheckName, line: this.loc.start.line, column: this.loc.start.column};
      // this.body.body.unshift(new ExpressionStatement(new CallExpression(this.frame.MEMCHECK_CALL_PUSH(),
      //                                                                   [literal(memcheckName),
      //                                                                    literal(o.name),
      //                                                                    literal(this.loc.start.line),
      //                                                                    literal(this.loc.start.column)])));

      //if (this.body.body[this.body.body.length-1].type !== 'ReturnStatement') {
        //this.body.body.push(new ExpressionStatement(new CallExpression(this.frame.MEMCHECK_CALL_POP(), [])));
      //}
    }
    this.body.body = lowerList(this.body.body, o);

    var prologue = createPrologue(this, o);
    var epilogue = createEpilogue(this, o);
    this.body.body = prologue.concat(this.body.body).concat(epilogue);

    return this;
  };

  ForStatement.prototype.lower = function (o) {
    o = extend(o);
    o.scope = this.scope;
    return Node.prototype.lower.call(this, o);
  };

  BlockStatement.prototype.lower = function (o) {
    o = extend(o);
    o.scope = this.scope;
    this.body = lowerList(this.body, o);
    return this;
  };

  function findParentFun(scope) {
    var name;
    while(scope.parent) {
      if(scope.name.indexOf("Function") === 0) {
        name = scope.name.split(" ")[1];
      }
    }
  }

  CatchClause.prototype.lower = function(o) {
    o = extend(o);
    // if(o.memcheck) {
    //   var fnLoc = o.scope.frame.memcheckFnLoc;
    //   this.body.body.unshift(new ExpressionStatement(new CallExpression(o.scope.frame.MEMCHECK_CALL_RESET(),
    //                                                                     [literal(fnLoc.name),
    //                                                                      literal(fnLoc.line),
    //                                                                      literal(fnLoc.column)])));
    // }
    return Node.prototype.lower.call(this, o);
  };


  Identifier.prototype.lowerNode = function (o) {
    var variable = this.variable;
    if (variable && variable.isStackAllocated) {
      return variable.getStackAccess(o.frame, this.loc);
    }
  };

  VariableDeclaration.prototype.lowerNode = function (o) {
    if (this.declarations.length === 0) {
      return null;
    }
  };

  VariableDeclarator.prototype.lowerNode = function (o) {
    if (this.id.ty && this.id.ty.arraySize) {
      return null;
    }

    if (!(this.id instanceof Identifier)) {
      if (this.init) {
        this.init = new AssignmentExpression(this.id, "=", this.init, this.init.loc);
        this.id = o.scope.freshTemp(undefined, this.id.loc, true);
      } else {
        return null;
      }
    }
  };

  ReturnStatement.prototype.lowerNode = function (o) {
    var scope = o.scope;
    var frameSize = scope.frame.frameSize;
    if (frameSize || o.memcheck) {
      var arg = this.argument;
      var t = scope.freshTemp(arg.ty, arg.loc);
      var assn = new AssignmentExpression(t, "=", arg, arg.loc);
      var exprList = [assn];
      if(frameSize) {
        var restoreStack = new AssignmentExpression(
            scope.frame.realSP(), "=", 
            forceType(
                cast(new BinaryExpression(
                    "+", forceType(scope.frame.realSP()), literal(frameSize)
                ), Types.u32ty)
            )
        );
        exprList.push(restoreStack);
      }
      if(o.memcheck) {
        var popMemcheck = new CallExpression(scope.MEMCHECK_CALL_POP(), []);
        exprList.push(popMemcheck);
      }
      exprList.push(forceType(cast(t, scope.frame.returnType)));
      this.argument = new SequenceExpression(exprList, arg.loc);
    }
  };

  BinaryExpression.prototype.lowerNode = function (o) {
    var ty = this.ty;
    var op = this.operator;

    if (ty instanceof PointerType && (op === "+" || op === "-")) {
      var lty = this.left.ty;
      var rty = this.right.ty;
      if (rty instanceof PrimitiveType && rty.integral) {
        var scale = lty.base.size;
        if (scale > 1) {
          this.right = new BinaryExpression("*", this.right, literal(scale), this.right.loc);
        }
      }
    }
  };

  UnaryExpression.prototype.lowerNode = function (o) {
    var arg = this.argument;

    if (this.operator === "*") {
      // If the identifer has already been aligned, so we just need to
      // pick out the unaligned address
      if(arg.left instanceof BinaryExpression) {
        arg.left = arg.left.left;
      }

      return dereference(arg, 0, this.ty, o.scope, this.loc);
    }

    if (this.operator === "&") {
      // We already have an aligned lookup, just grab the pointer
      // out of it though (see `alignAddress` in util.js)
      if(arg instanceof BinaryExpression) {
        arg = arg.left;
      }

      return arg.property.left;
    }
  };

  MemberExpression.prototype.lowerNode = function (o) {
    var field = this.structField;
    if(!field) {
      return;
    }

    var address, view;
    if (this.kind === "->") {
      address = this.object;
    } else {
      // The identifer has already been aligned, so we just need to
      // pick out the unaligned address
      var obj = this.object;
      if(obj instanceof BinaryExpression) {
        obj = obj.left;
      }

      assert(obj instanceof MemberExpression);
      assert(obj.property instanceof BinaryExpression);
      address = obj.property.left;
    }

    var def = dereference(address, field.offset, field.type, o.scope, this.loc);

    if(!this.lvalue) {
      return forceType(def);
    }
    return def;
  };

  CastExpression.prototype.lowerNode = function (o) {
    // Treat user casts as forced casts so we don't emit warnings.
    var lowered = this.ty.convert(this.argument, (!!this.as || this.force), o.warn);
    // Remember (coerce) the type for nested conversions.
    lowered.ty = this.ty;
    return lowered;
  };

  function extractExterns(node) {
    var externs = [];

    if(node instanceof Program) { 
      for(var i=0; i<node.body.length; i++) {
        var expr = node.body[i];

        if(expr instanceof VariableDeclaration && expr.kind == 'extern') {
          for(var j=0; j<expr.declarations.length; j++) {
            externs.push(expr.declarations[j].id.name);
          }
        }
      }
    }

    return externs;
  }

  function warningOptions(options) {
    var warn = {};
    for (var p in options) {
      if (p.charAt(0) === "W") {
        warn[p.substr(1)] = true;
      }
    }
    return warn;
  }

  var logger;

  function compile(node, name, _logger, options) {
    // The logger is closed over by all the functions.
    logger = _logger;

    // Lift into constructors.
    node = T.lift(node);

    // Extract global externs
    var externs = extractExterns(node);

    // Pass 1.
    logger.info("Pass 1");
    var types = resolveAndLintTypes(node, clone(Types.builtinTypes));
    var o = { types: types, name: name, logger: _logger, warn: warningOptions(options), memcheck: options.memcheck };

    // Pass 2.
    logger.info("Pass 2");
    node.scan(o);

    // Pass 3.
    logger.info("Pass 3");
    node = node.transform(o);

    // Pass 4.
    logger.info("Pass 4");
    node = node.lower(o);

    return {
      externs: externs, 
      node: T.flatten(node)
    };
  }

  exports.compile = compile;

})(typeof exports === 'undefined' ? (compiler = {}) : exports);
