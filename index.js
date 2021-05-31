function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.src = src
    img.onload = () => res(img)
    img.error = rej
  })
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  canvas.style = `width:${width}px; height: ${height}px`
  return context
}

function toGray(R, G, B) {
  return ~~(R * 0.299 + G * 0.587 + B * 0.114)
}

function getImageData(ctx, image) {
  ctx.drawImage(image, 0,0)
  const data = ctx.getImageData(0,0, image.width, image.height).data
  const grayList = []

  for (let i = 0; i < data.length; i++) {
    grayList.push(toGray(data[i++], data[i++], data[i++]))
  }
  return grayList
}

function ostu1(grayList) {
  let min = 255, max = -1
  let total = grayList.length
  const table = []

  grayList.forEach(item => {
    table[item] = (table[item] || 0)  + 1
    if (min > item) min = item
    if (max < item) max = item
  })

  let w0, u0, w1, u1, t
  w0 = u0 = w1 = u1 = 0
  for (let i=min; i<=max; i++) {
    table[i] = table[i] || 0
    table[i] /= total
    if (i!==min) {
      u1 += table[i] * i
    }
  }
  w0 = table[min]
  w1 = 1 - w0
  u0 = min
  u1 = u1 / w1
  t = w0 * w1 * (u0 - u1) * (u0 - u1)

  for (let i=min + 1; i<max; i++) {
    u0 = u0 * w0 + table[i] * i
    u1 = u1 * w1 - table[i] * i
    w0 += table[i]
    w1 = 1 - w0
    u0/=w0
    u1/=w1

    let temp = w0 * w1 * (u0 - u1) * (u0 - u1)
    if (t<temp) {
      t = temp
    }
  }
  console.log(t)
  return t
}

function ostu(grayList) {
  let min = 255, max = -1
  let t = -1, threshold
  const size = grayList.length
  const histogram = new Array(256).fill(0)

  grayList.forEach(item => {
    histogram[item]++
    if (min > item) min = item
    if (max < item) max = item
  })

  for (let i = min + 1; i < max; i++) {
    let sum0, sum1, cnt0, cnt1, w0, w1
    sum0 = sum1 = cnt0 = cnt1 = w0 = w1 = 0

    for (let j = min; j < i; j++) {
      cnt0 += histogram[j]
			sum0 += j * histogram[j]
    }
    u0 = sum0 /  cnt0
		w0 = cnt0 / size
    for (let j = i ; j<=max;  j++) {
      cnt1 += histogram[j]
			sum1 += j * histogram[j]
    }
    u1 = sum1 / cnt1;
    w1 = 1 - w0

    const tempT = w0 * w1 *  (u0 - u1) * (u0 - u1)

    if (t < tempT) {
      t = tempT
      threshold = i
    }
  }
  console.log(t, threshold)
  return threshold
}

function getGrayImageData(img, grayList, threshold) {
  const imgData = new ImageData(img.width, img.height)
  const arr = imgData.data
  let j = 0
  for (let i = 0; i < grayList.length; i++) {
    for (let k = 0; k < 3; k++) {
      arr[j++] = grayList[i] < threshold ? 0 : 255
    }
    arr[j++] = 255
  }
  return imgData
}

function sleep(time) {
  return new Promise((res) => {
    setTimeout(res, time)
  }) 
}

async function drawFromTopToBottom(ctx, img, grayList, threshold) {
  const {width, height} = img
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#000'
  let countdown = width
  for (let i = 0, len = grayList.length; i< len; i++)  {
    if (grayList[i] < threshold) {
      const row = ~~(i / width)
      const col = i % width
      ctx.fillRect(col, row, 1, 1)
    }
    // 完成一行暂停一下
    if (!--countdown) {
      await sleep(0)
      countdown = width
    }
  }
}

let SLEEP_INTRVAL = 1
async function drawDfs(ctx, img, grayList, threshold) {
  const {width, height} = img
  
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#000'
  const grayData = []


  for (let i = 0; i < grayList.length; i++) {
    const row = ~~(i / width)
    const col = i % width
    if (!grayData[row]) {
      grayData[row] = []
    }
    grayData[row][col] = grayList[i] < threshold ?  0 : 255
  }
  grayList.length = 0
  // dfs
  const visited = new Map()

  function k(row, col) {
    return row + ',' + col
  }

  let countdown = SLEEP_INTRVAL
  async function traverse(row, col) {
    if (visited.has(k(row, col)) || row + 1 > height || col + 1 > width) return

    visited.set(k(row, col), 1)
    if (grayData[row][col] === 0) {
      ctx.fillRect(col, row, 1, 1)
      if (--countdown === 0) {
        countdown = SLEEP_INTRVAL
        await sleep(0)
      }
      await traverse(row, col + 1)
      await traverse(row + 1, col)
      await traverse(row + 1, col + 1)
    }
  }

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      await traverse(i, j)
    }
  }
}

async function main(path) {
  const img = await loadImage(path)
  const ctx = createCanvas(img.width, img.height)
  const data = getImageData(ctx, img)
  // const gray =  getGrayImageData(img, data, ostu(data))
  // ctx.putImageData(gray,0,0)
  document.body.appendChild(ctx.canvas)
  const gif = toGif(ctx)

  drawDfs(ctx, img, data, ostu(data)).then(() => {
    gif.loopend = true
    gif.render()
  })
}

window.onload = function() {
  const btnUpload = document.getElementById('btnUpload')
  const sleepTime = document.getElementById('sleepTime')

  btnUpload.onchange = function() {
    const file = this.files[0]
    const url = URL.createObjectURL(file)

    main(url).then(() => {
      URL.revokeObjectURL(url)
    })
  }

  sleepTime.onchange = function() {
    SLEEP_INTRVAL = ~~+this.value
  }
  SLEEP_INTRVAL = ~~+sleepTime.value
}


function toGif(ctx) {
  const gif = new GIF({
    workers: 2,
    quality: 10
  })

  gif.on('finished', function(blob) {
    toDownload(blob)
  })
  function addFrame() {
    gif.loop && window.clearTimeout(gif.loop)
    gif.loop = setTimeout(() => {
      if (gif.loopend) {
        return
      }
      gif.addFrame(ctx.canvas, {copy: true, delay: 15})
      addFrame()
    }, 15)
  }

  addFrame()
  return gif
}

function toDownload(blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  window.open(url)
  a.href = url
  a.download = `drawing_${Date.now()}.gif`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
